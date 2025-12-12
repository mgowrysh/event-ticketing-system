// SE3309 Assignment 4 - Event Ticketing System Backend
// Server setup with Express and MySQL connection

require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MySQL Database Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

// Test database connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
        process.exit(1);
    }
    console.log('✓ Connected to MySQL database');
    connection.release();
});

// ============================================================================
// FUNCTIONALITY 1: Browse Events (Query with JOIN)
// SQL Features: JOIN, WHERE, ORDER BY
// ============================================================================
app.get('/api/events', async (req, res) => {
    try {
        const { venue, status, dateFrom, dateTo } = req.query;

        let query = `
            SELECT 
                e.name AS event_name,
                e.date AS event_date,
                e.status,
                v.name AS venue_name,
                v.address AS venue_address,
                v.capacity,
                COUNT(DISTINCT es.section) AS sections,
                COUNT(es.number) AS total_seats,
                SUM(CASE WHEN es.availability_status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available_seats
            FROM Event e
            INNER JOIN Venue v ON e.venue_name = v.name AND e.venue_address = v.address
            LEFT JOIN EventSeat es ON e.name = es.event_name 
                AND e.date = es.event_date 
                AND e.venue_name = es.venue_name 
                AND e.venue_address = es.venue_address
            WHERE 1=1
        `;

        const params = [];

        if (venue) {
            query += ` AND v.name LIKE ?`;
            params.push(`%${venue}%`);
        }

        if (status) {
            query += ` AND e.status = ?`;
            params.push(status);
        }

        if (dateFrom) {
            query += ` AND e.date >= ?`;
            params.push(dateFrom);
        }

        if (dateTo) {
            query += ` AND e.date <= ?`;
            params.push(dateTo);
        }

        query += `
            GROUP BY e.name, e.date, e.venue_name, e.venue_address, v.name, v.address, v.capacity, e.status
            ORDER BY e.date ASC, e.name ASC
        `;

        const [events] = await promisePool.query(query, params);
        res.json({ success: true, events });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// FUNCTIONALITY 2: Purchase Tickets (INSERT with Transaction and Validation)
// SQL Features: Multiple operations, Transaction, Subquery, UPDATE
// ============================================================================
app.post('/api/purchase', async (req, res) => {
    const connection = await promisePool.getConnection();

    try {
        await connection.beginTransaction();

        const { customer_email, event_name, event_date, venue_name, venue_address,
            seats, payment_method } = req.body;

        // Validate customer exists
        const [customers] = await connection.query(
            'SELECT email FROM Customer WHERE email = ?',
            [customer_email]
        );

        if (customers.length === 0) {
            throw new Error('Customer not found');
        }

        // Validate event exists
        const [events] = await connection.query(
            'SELECT * FROM Event WHERE name = ? AND date = ? AND venue_name = ? AND venue_address = ?',
            [event_name, event_date, venue_name, venue_address]
        );

        if (events.length === 0) {
            throw new Error('Event not found');
        }

        const purchasedTickets = [];

        for (const seat of seats) {
            const { section, row, number } = seat;

            // Check seat availability using subquery
            const [seatCheck] = await connection.query(`
                SELECT availability_status, price 
                FROM EventSeat 
                WHERE event_name = ? AND event_date = ? 
                  AND venue_name = ? AND venue_address = ?
                  AND \`section\` = ? AND \`row\` = ? AND \`number\` = ?
                  AND availability_status = 'AVAILABLE'
            `, [event_name, event_date, venue_name, venue_address, section, row, number]);

            if (seatCheck.length === 0) {
                throw new Error(`Seat ${section}-${row}-${number} is not available`);
            }

            const price = seatCheck[0].price;

            // Generate unique QR code
            const qr_code = `QR${Date.now()}${Math.random().toString(36).substr(2, 9)}`.toUpperCase();

            // 1. Create Order first
            const [orderResult] = await connection.query(`
                INSERT INTO \`Order\` (order_date, subtotal, discount_amount, order_status, customer_email)
                VALUES (NOW(), ?, 0.00, 'PAID', ?)
            `, [price, customer_email]);

            const order_num = orderResult.insertId;

            // 2. Insert Ticket linked to Order
            await connection.query(`
                INSERT INTO Ticket (qr_code, issue_date, status, order_num, 
                    event_name, event_date, venue_name, venue_address, \`section\`, \`row\`, \`number\`)
                VALUES (?, NOW(), 'ISSUED', ?, ?, ?, ?, ?, ?, ?, ?)
            `, [qr_code, order_num, event_name, event_date,
                venue_name, venue_address, section, row, number]);

            // Update seat availability
            await connection.query(`
                UPDATE EventSeat 
                SET availability_status = 'SOLD'
                WHERE event_name = ? AND event_date = ? 
                  AND venue_name = ? AND venue_address = ?
                  AND \`section\` = ? AND \`row\` = ? AND \`number\` = ?
            `, [event_name, event_date, venue_name, venue_address, section, row, number]);

            purchasedTickets.push({
                qr_code,
                section,
                row,
                number,
                price,
                order_num
            });
        }

        await connection.commit();
        res.json({
            success: true,
            message: 'Tickets purchased successfully',
            tickets: purchasedTickets
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error purchasing tickets:', error);
        res.status(400).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
});

// ============================================================================
// FUNCTIONALITY 3: Customer Purchase History (Complex Query with Multiple JOINs)
// SQL Features: Multiple JOINs, GROUP BY, Aggregates (COUNT, SUM)
// ============================================================================
app.get('/api/history/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const query = `
            SELECT 
                c.email,
                CONCAT(p.first_name, ' ', p.last_name) AS customer_name,
                c.loyalty_tier,
                COUNT(t.qr_code) AS total_tickets,
                SUM(o.subtotal) AS total_spent,
                t.qr_code,
                'CREDIT_CARD' AS payment_method,
                o.order_date AS purchase_date,
                o.subtotal AS total_price,
                e.name AS event_name,
                e.date AS event_date,
                e.status AS event_status,
                v.name AS venue_name,
                CONCAT(t.\`section\`, '-', t.\`row\`, '-', t.\`number\`) AS seat_location,
                CASE 
                    WHEN ci.qr_code IS NOT NULL THEN 'Checked In'
                    ELSE 'Not Checked In'
                END AS checkin_status
            FROM Customer c
            INNER JOIN Person p ON c.email = p.email
            LEFT JOIN \`Order\` o ON c.email = o.customer_email
            LEFT JOIN Ticket t ON o.order_num = t.order_num
            LEFT JOIN Event e ON t.event_name = e.name 
                AND t.event_date = e.date 
                AND t.venue_name = e.venue_name 
                AND t.venue_address = e.venue_address
            LEFT JOIN Venue v ON e.venue_name = v.name AND e.venue_address = v.address
            LEFT JOIN CheckIn ci ON t.qr_code = ci.qr_code
            WHERE c.email = ?
            GROUP BY c.email, p.first_name, p.last_name, c.loyalty_tier, t.qr_code, 
                     o.order_date, o.subtotal, e.name, e.date, e.status, 
                     v.name, t.\`section\`, t.\`row\`, t.\`number\`, ci.qr_code
            ORDER BY o.order_date DESC
        `;

        const [results] = await promisePool.query(query, [email]);

        if (results.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found or no purchase history' });
        }

        res.json({ success: true, history: results });
    } catch (error) {
        console.error('Error fetching purchase history:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// FUNCTIONALITY 4: Check-In Tickets (INSERT with Validation)
// SQL Features: INSERT, JOIN for validation, Subquery
// ============================================================================
app.post('/api/checkin', async (req, res) => {
    try {
        const { qr_code, gate } = req.body;

        // Validate ticket exists using JOIN
        const [tickets] = await promisePool.query(`
            SELECT t.*, e.name AS event_name, e.date AS event_date, 
                   CONCAT(t.\`section\`, '-', t.\`row\`, '-', t.\`number\`) AS seat
            FROM Ticket t
            INNER JOIN Event e ON t.event_name = e.name 
                AND t.event_date = e.date 
                AND t.venue_name = e.venue_name 
                AND t.venue_address = e.venue_address
            WHERE t.qr_code = ?
        `, [qr_code]);

        if (tickets.length === 0) {
            return res.status(404).json({ success: false, error: 'Invalid QR code' });
        }

        // Check if already checked in
        const [existingCheckIn] = await promisePool.query(
            'SELECT * FROM CheckIn WHERE qr_code = ?',
            [qr_code]
        );

        if (existingCheckIn.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Ticket already checked in',
                checkin_time: existingCheckIn[0].checkin_time
            });
        }

        // Insert check-in record
        await promisePool.query(
            'INSERT INTO CheckIn (qr_code, checkin_time, gate) VALUES (?, NOW(), ?)',
            [qr_code, gate]
        );

        res.json({
            success: true,
            message: 'Check-in successful',
            ticket: tickets[0]
        });

    } catch (error) {
        console.error('Error checking in:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// FUNCTIONALITY 5: Sales Report (Complex Aggregation with GROUP BY and HAVING)
// SQL Features: Multiple JOINs, GROUP BY, Multiple Aggregates, HAVING, ORDER BY
// ============================================================================
app.get('/api/reports/sales', async (req, res) => {
    try {
        const { event_name, min_tickets } = req.query;

        let query = `
            SELECT 
                e.name AS event_name,
                e.date AS event_date,
                e.status,
                v.name AS venue_name,
                v.capacity,
                COUNT(DISTINCT t.qr_code) AS tickets_sold,
                COUNT(DISTINCT o.customer_email) AS unique_customers,
                SUM(o.subtotal) AS total_revenue,
                AVG(o.subtotal) AS avg_ticket_price,
                MIN(o.subtotal) AS min_price,
                MAX(o.subtotal) AS max_price,
                COUNT(DISTINCT ci.qr_code) AS checked_in_count,
                ROUND((COUNT(DISTINCT ci.qr_code) * 100.0 / NULLIF(COUNT(DISTINCT t.qr_code), 0)), 2) AS checkin_rate
            FROM Event e
            INNER JOIN Venue v ON e.venue_name = v.name AND e.venue_address = v.address
            LEFT JOIN Ticket t ON e.name = t.event_name 
                AND e.date = t.event_date 
                AND e.venue_name = t.venue_name 
                AND e.venue_address = t.venue_address
            LEFT JOIN \`Order\` o ON t.order_num = o.order_num
            LEFT JOIN CheckIn ci ON t.qr_code = ci.qr_code
            WHERE 1=1
        `;

        const params = [];

        if (event_name) {
            query += ` AND e.name LIKE ?`;
            params.push(`%${event_name}%`);
        }

        query += `
            GROUP BY e.name, e.date, e.status, v.name, v.capacity
        `;

        if (min_tickets) {
            query += ` HAVING tickets_sold >= ?`;
            params.push(parseInt(min_tickets));
        }

        query += ` ORDER BY total_revenue DESC, tickets_sold DESC`;

        const [reports] = await promisePool.query(query, params);
        res.json({ success: true, reports });

    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// FUNCTIONALITY 6: Update Loyalty Tiers (UPDATE with Subquery and Aggregation)
// SQL Features: UPDATE, Subquery, JOIN, GROUP BY, HAVING
// ============================================================================
app.post('/api/loyalty/update', async (req, res) => {
    try {
        const { min_purchases, target_tier } = req.body;

        if (!['Bronze', 'Silver', 'Gold'].includes(target_tier)) {
            return res.status(400).json({ success: false, error: 'Invalid tier' });
        }

        // First, get customers who qualify
        const [qualifyingCustomers] = await promisePool.query(`
            SELECT 
                c.email,
                CONCAT(p.first_name, ' ', p.last_name) AS name,
                c.loyalty_tier AS current_tier,
                COUNT(t.qr_code) AS purchase_count,
                SUM(o.subtotal) AS total_spent
            FROM Customer c
            INNER JOIN Person p ON c.email = p.email
            LEFT JOIN \`Order\` o ON c.email = o.customer_email
            LEFT JOIN Ticket t ON o.order_num = t.order_num
            GROUP BY c.email, p.first_name, p.last_name, c.loyalty_tier
            HAVING purchase_count >= ?
        `, [min_purchases]);

        if (qualifyingCustomers.length === 0) {
            return res.json({
                success: true,
                message: 'No customers qualify for upgrade',
                updated: []
            });
        }

        // Update their tiers
        const [updateResult] = await promisePool.query(`
            UPDATE Customer c
            SET c.loyalty_tier = ?
            WHERE c.email IN (
                SELECT email FROM (
                    SELECT c2.email
                    FROM Customer c2
                    LEFT JOIN \`Order\` o ON c2.email = o.customer_email
                    LEFT JOIN Ticket t ON o.order_num = t.order_num
                    GROUP BY c2.email
                    HAVING COUNT(t.qr_code) >= ?
                ) AS qualifying_customers
            )
        `, [target_tier, min_purchases]);

        res.json({
            success: true,
            message: `Updated ${updateResult.affectedRows} customers to ${target_tier} tier`,
            updated: qualifyingCustomers.map(c => ({
                email: c.email,
                name: c.name,
                old_tier: c.current_tier,
                new_tier: target_tier,
                purchase_count: c.purchase_count
            }))
        });

    } catch (error) {
        console.error('Error updating loyalty tiers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// FUNCTIONALITY 7: Manage Event Status (UPDATE with Validation)
// SQL Features: UPDATE, JOIN for validation
// ============================================================================
app.put('/api/events/status', async (req, res) => {
    try {
        const { event_name, event_date, venue_name, venue_address, new_status } = req.body;

        if (!['SCHEDULED', 'CANCELLED', 'COMPLETED'].includes(new_status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        // Get current event details
        const [beforeUpdate] = await promisePool.query(`
            SELECT e.*, v.name AS venue_display_name
            FROM Event e
            INNER JOIN Venue v ON e.venue_name = v.name AND e.venue_address = v.address
            WHERE e.name = ? AND e.date = ? AND e.venue_name = ? AND e.venue_address = ?
        `, [event_name, event_date, venue_name, venue_address]);

        if (beforeUpdate.length === 0) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        const old_status = beforeUpdate[0].status;

        // Update status
        await promisePool.query(`
            UPDATE Event 
            SET status = ?
            WHERE name = ? AND date = ? AND venue_name = ? AND venue_address = ?
        `, [new_status, event_name, event_date, venue_name, venue_address]);

        // Get updated event details
        const [afterUpdate] = await promisePool.query(`
            SELECT e.*, v.name AS venue_display_name
            FROM Event e
            INNER JOIN Venue v ON e.venue_name = v.name AND e.venue_address = v.address
            WHERE e.name = ? AND e.date = ? AND e.venue_name = ? AND e.venue_address = ?
        `, [event_name, event_date, venue_name, venue_address]);

        res.json({
            success: true,
            message: `Event status updated from ${old_status} to ${new_status}`,
            before: beforeUpdate[0],
            after: afterUpdate[0]
        });

    } catch (error) {
        console.error('Error updating event status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper endpoint to get all venues for dropdown
app.get('/api/venues', async (req, res) => {
    try {
        const [venues] = await promisePool.query('SELECT name, address FROM Venue ORDER BY name');
        res.json({ success: true, venues });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper endpoint to get available seats for an event
app.get('/api/seats/:event_name/:event_date', async (req, res) => {
    try {
        const { event_name, event_date } = req.params;
        const [seats] = await promisePool.query(`
            SELECT \`section\`, \`row\`, \`number\`, price, availability_status
            FROM EventSeat
            WHERE event_name = ? AND event_date = ?
            ORDER BY \`section\`, \`row\`, \`number\`
        `, [event_name, event_date]);
        res.json({ success: true, seats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
    console.log(`✓ Database: ${process.env.DB_NAME}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    pool.end();
    process.exit(0);
});
