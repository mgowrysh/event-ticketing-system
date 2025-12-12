// Event Ticketing System - Frontend JavaScript
// Handles all user interactions and API calls

const API_BASE = 'http://localhost:3000/api';

// Navigation between sections
function showSection(sectionId) {
    // Hide all sections first
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show the selected section
    document.getElementById(sectionId).classList.add('active');

    // Highlight the clicked nav button
    event.target.classList.add('active');
}

// Display helper functions
function showError(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="alert alert-error">
            <strong>Error:</strong> ${message}
        </div>
    `;
}

function showSuccess(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="alert alert-success">
            <strong>Success!</strong> ${message}
        </div>
    `;
}

function showInfo(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="alert alert-info">
            ${message}
        </div>
    `;
}

// ============================================================================
// FUNCTIONALITY 1: Browse Events
// ============================================================================
async function browseEvents(event) {
    event.preventDefault();

    const venue = document.getElementById('filter-venue').value;
    const status = document.getElementById('filter-status').value;
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;

    const params = new URLSearchParams();
    if (venue) params.append('venue', venue);
    if (status) params.append('status', status);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    try {
        const response = await fetch(`${API_BASE}/events?${params}`);
        const data = await response.json();

        if (!data.success) {
            showError('events-results', data.error);
            return;
        }

        if (data.events.length === 0) {
            showInfo('events-results', 'No events found matching your criteria.');
            return;
        }

        // Create the results table
        let html = `
            <h3>Found ${data.events.length} Event(s)</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Event Name</th>
                        <th>Date</th>
                        <th>Venue</th>
                        <th>Status</th>
                        <th>Total Seats</th>
                        <th>Available</th>
                        <th>Sections</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.events.forEach(event => {
            html += `
                <tr>
                    <td><strong>${event.event_name}</strong></td>
                    <td>${new Date(event.event_date).toLocaleDateString()}</td>
                    <td>${event.venue_name}</td>
                    <td><span class="badge badge-${event.status.toLowerCase()}">${event.status}</span></td>
                    <td>${event.total_seats || 0}</td>
                    <td>${event.available_seats || 0}</td>
                    <td>${event.sections || 0}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        document.getElementById('events-results').innerHTML = html;

    } catch (error) {
        showError('events-results', 'Failed to connect to server. Make sure the backend is running.');
    }
}

// ============================================================================
// FUNCTIONALITY 2: Purchase Tickets
// ============================================================================
async function purchaseTickets(event) {
    event.preventDefault();

    const purchaseData = {
        customer_email: document.getElementById('purchase-email').value,
        event_name: document.getElementById('purchase-event').value,
        event_date: document.getElementById('purchase-date').value,
        venue_name: document.getElementById('purchase-venue').value,
        venue_address: document.getElementById('purchase-address').value,
        payment_method: document.getElementById('purchase-payment').value,
        seats: [{
            section: document.getElementById('purchase-section').value,
            row: document.getElementById('purchase-row').value,
            number: document.getElementById('purchase-number').value
        }]
    };

    try {
        const response = await fetch(`${API_BASE}/purchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(purchaseData)
        });

        const data = await response.json();

        if (!data.success) {
            showError('purchase-results', data.error);
            return;
        }

        // Show success with ticket details
        let html = `
            <div class="alert alert-success">
                <strong>Purchase Successful!</strong> Your ticket has been confirmed.
            </div>
        `;

        data.tickets.forEach(ticket => {
            html += `
                <div class="ticket-box">
                    <h4>🎫 Ticket Details</h4>
                    <div class="ticket-details">
                        <div class="ticket-detail">
                            <strong>QR Code</strong>
                            <span>${ticket.qr_code}</span>
                        </div>
                        <div class="ticket-detail">
                            <strong>Seat Location</strong>
                            <span>${ticket.section}-${ticket.row}-${ticket.number}</span>
                        </div>
                        <div class="ticket-detail">
                            <strong>Price</strong>
                            <span>$${parseFloat(ticket.price).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `<p style="margin-top: 15px; color: var(--text-light);">Save your QR code for check-in at the venue!</p>`;

        document.getElementById('purchase-results').innerHTML = html;

        // Clear the form
        document.getElementById('purchaseForm').reset();

    } catch (error) {
        showError('purchase-results', 'Failed to process purchase. Please check your connection.');
    }
}

// ============================================================================
// FUNCTIONALITY 3: Customer Purchase History
// ============================================================================
async function viewHistory(event) {
    event.preventDefault();

    const email = document.getElementById('history-email').value;

    try {
        const response = await fetch(`${API_BASE}/history/${encodeURIComponent(email)}`);
        const data = await response.json();

        if (!data.success) {
            showError('history-results', data.error);
            return;
        }

        if (data.history.length === 0) {
            showInfo('history-results', 'No purchase history found for this customer.');
            return;
        }

        const customer = data.history[0];
        const totalTickets = customer.total_tickets || 0;
        const totalSpent = parseFloat(customer.total_spent || 0);

        // Summary cards at top
        let html = `
            <div class="summary-grid">
                <div class="summary-card">
                    <h4>Customer</h4>
                    <div class="value">${customer.customer_name}</div>
                </div>
                <div class="summary-card">
                    <h4>Loyalty Tier</h4>
                    <div class="value">${customer.loyalty_tier}</div>
                </div>
                <div class="summary-card">
                    <h4>Total Tickets</h4>
                    <div class="value">${totalTickets}</div>
                </div>
                <div class="summary-card">
                    <h4>Total Spent</h4>
                    <div class="value">$${totalSpent.toFixed(2)}</div>
                </div>
            </div>
            
            <h3>Purchase History</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>QR Code</th>
                        <th>Event</th>
                        <th>Date</th>
                        <th>Venue</th>
                        <th>Seat</th>
                        <th>Price</th>
                        <th>Payment</th>
                        <th>Check-In</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.history.forEach(ticket => {
            if (ticket.qr_code) {
                html += `
                    <tr>
                        <td><code>${ticket.qr_code}</code></td>
                        <td>${ticket.event_name || 'N/A'}</td>
                        <td>${ticket.event_date ? new Date(ticket.event_date).toLocaleDateString() : 'N/A'}</td>
                        <td>${ticket.venue_name || 'N/A'}</td>
                        <td>${ticket.seat_location || 'N/A'}</td>
                        <td>$${parseFloat(ticket.total_price || 0).toFixed(2)}</td>
                        <td>${ticket.payment_method || 'N/A'}</td>
                        <td>${ticket.checkin_status === 'Checked In' ? '✅' : '⏳'}</td>
                    </tr>
                `;
            }
        });

        html += `
                </tbody>
            </table>
        `;

        document.getElementById('history-results').innerHTML = html;

    } catch (error) {
        showError('history-results', 'Failed to fetch history. Please check your connection.');
    }
}

// ============================================================================
// FUNCTIONALITY 4: Check-In Tickets
// ============================================================================
async function checkInTicket(event) {
    event.preventDefault();

    const checkinData = {
        qr_code: document.getElementById('checkin-qr').value,
        gate: document.getElementById('checkin-gate').value
    };

    try {
        const response = await fetch(`${API_BASE}/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(checkinData)
        });

        const data = await response.json();

        if (!data.success) {
            showError('checkin-results', data.error);
            return;
        }

        const ticket = data.ticket;

        let html = `
            <div class="alert alert-success">
                <strong>✅ Check-In Successful!</strong>
            </div>
            <div class="ticket-box">
                <h4>Ticket Information</h4>
                <div class="ticket-details">
                    <div class="ticket-detail">
                        <strong>Event</strong>
                        <span>${ticket.event_name}</span>
                    </div>
                    <div class="ticket-detail">
                        <strong>Date</strong>
                        <span>${new Date(ticket.event_date).toLocaleDateString()}</span>
                    </div>
                    <div class="ticket-detail">
                        <strong>Seat</strong>
                        <span>${ticket.seat}</span>
                    </div>
                    <div class="ticket-detail">
                        <strong>Gate</strong>
                        <span>${checkinData.gate}</span>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('checkin-results').innerHTML = html;

        // Clear form
        document.getElementById('checkinForm').reset();

    } catch (error) {
        showError('checkin-results', 'Failed to check in. Please verify the connection.');
    }
}

// ============================================================================
// FUNCTIONALITY 5: Sales Reports
// ============================================================================
async function generateReport(event) {
    event.preventDefault();

    const eventName = document.getElementById('report-event').value;
    const minTickets = document.getElementById('report-min-tickets').value;

    const params = new URLSearchParams();
    if (eventName) params.append('event_name', eventName);
    if (minTickets) params.append('min_tickets', minTickets);

    try {
        const response = await fetch(`${API_BASE}/reports/sales?${params}`);
        const data = await response.json();

        if (!data.success) {
            showError('reports-results', data.error);
            return;
        }

        if (data.reports.length === 0) {
            showInfo('reports-results', 'No sales data found matching your criteria.');
            return;
        }

        let html = `
            <h3>Sales Report - ${data.reports.length} Event(s)</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Event</th>
                        <th>Date</th>
                        <th>Venue</th>
                        <th>Tickets Sold</th>
                        <th>Unique Customers</th>
                        <th>Total Revenue</th>
                        <th>Avg Price</th>
                        <th>Check-In Rate</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let totalRevenue = 0;
        let totalTickets = 0;

        data.reports.forEach(report => {
            totalRevenue += parseFloat(report.total_revenue || 0);
            totalTickets += parseInt(report.tickets_sold || 0);

            html += `
                <tr>
                    <td><strong>${report.event_name}</strong></td>
                    <td>${new Date(report.event_date).toLocaleDateString()}</td>
                    <td>${report.venue_name}</td>
                    <td>${report.tickets_sold}</td>
                    <td>${report.unique_customers}</td>
                    <td>$${parseFloat(report.total_revenue || 0).toFixed(2)}</td>
                    <td>$${parseFloat(report.avg_ticket_price || 0).toFixed(2)}</td>
                    <td>${report.checkin_rate || 0}%</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
            <div class="summary-grid" style="margin-top: 20px;">
                <div class="summary-card">
                    <h4>Total Revenue</h4>
                    <div class="value">$${totalRevenue.toFixed(2)}</div>
                </div>
                <div class="summary-card">
                    <h4>Total Tickets</h4>
                    <div class="value">${totalTickets}</div>
                </div>
            </div>
        `;

        document.getElementById('reports-results').innerHTML = html;

    } catch (error) {
        showError('reports-results', 'Failed to generate report. Check your connection.');
    }
}

// ============================================================================
// FUNCTIONALITY 6: Update Loyalty Tiers
// ============================================================================
async function updateLoyalty(event) {
    event.preventDefault();

    const updateData = {
        min_purchases: parseInt(document.getElementById('loyalty-min-purchases').value),
        target_tier: document.getElementById('loyalty-tier').value
    };

    try {
        const response = await fetch(`${API_BASE}/loyalty/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        const data = await response.json();

        if (!data.success) {
            showError('loyalty-results', data.error);
            return;
        }

        if (data.updated.length === 0) {
            showInfo('loyalty-results', data.message);
            return;
        }

        let html = `
            <div class="alert alert-success">
                ${data.message}
            </div>
            <h3>Updated Customers</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Email</th>
                        <th>Name</th>
                        <th>Old Tier</th>
                        <th>New Tier</th>
                        <th>Purchase Count</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.updated.forEach(customer => {
            html += `
                <tr>
                    <td>${customer.email}</td>
                    <td>${customer.name}</td>
                    <td><span class="badge badge-${customer.old_tier.toLowerCase()}">${customer.old_tier}</span></td>
                    <td><span class="badge badge-${customer.new_tier.toLowerCase()}">${customer.new_tier}</span></td>
                    <td>${customer.purchase_count}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        document.getElementById('loyalty-results').innerHTML = html;

    } catch (error) {
        showError('loyalty-results', 'Failed to update loyalty tiers.');
    }
}

// ============================================================================
// FUNCTIONALITY 7: Manage Event Status
// ============================================================================
async function updateEventStatus(event) {
    event.preventDefault();

    const statusData = {
        event_name: document.getElementById('manage-event').value,
        event_date: document.getElementById('manage-date').value,
        venue_name: document.getElementById('manage-venue').value,
        venue_address: document.getElementById('manage-address').value,
        new_status: document.getElementById('manage-status').value
    };

    try {
        const response = await fetch(`${API_BASE}/events/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(statusData)
        });

        const data = await response.json();

        if (!data.success) {
            showError('manage-results', data.error);
            return;
        }

        let html = `
            <div class="alert alert-success">
                ${data.message}
            </div>
            <div class="card">
                <h3>Event Details</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Field</th>
                            <th>Before</th>
                            <th>After</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>Event Name</strong></td>
                            <td>${data.before.name}</td>
                            <td>${data.after.name}</td>
                        </tr>
                        <tr>
                            <td><strong>Date</strong></td>
                            <td>${new Date(data.before.date).toLocaleDateString()}</td>
                            <td>${new Date(data.after.date).toLocaleDateString()}</td>
                        </tr>
                        <tr>
                            <td><strong>Status</strong></td>
                            <td><span class="badge badge-${data.before.status.toLowerCase()}">${data.before.status}</span></td>
                            <td><span class="badge badge-${data.after.status.toLowerCase()}">${data.after.status}</span></td>
                        </tr>
                        <tr>
                            <td><strong>Venue</strong></td>
                            <td>${data.before.venue_display_name}</td>
                            <td>${data.after.venue_display_name}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('manage-results').innerHTML = html;

    } catch (error) {
        showError('manage-results', 'Failed to update event status.');
    }
}

// Load events on page load
window.addEventListener('DOMContentLoaded', () => {
    browseEvents(new Event('submit'));
});
