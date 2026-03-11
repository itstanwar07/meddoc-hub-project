/* ═══════════════════════════════════════════════════════════════
   auth.js  —  MedDoc Hub Shared Authentication
   ─────────────────────────────────────────────────────────────
   Handles:
   • User registration (signup) with email + password + role
   • Login with email + password validation (must be registered)
   • Role-based portal redirects
   • Nav bar auth state (logged in / logged out)
   • Portal dropdown
   • Inline gate forms on dashboards
   ═══════════════════════════════════════════════════════════════ */

// ── Storage helpers ───────────────────────────────────────────
function getUsers() { return JSON.parse(localStorage.getItem('mdh_users') || '[]'); }
function saveUsers(users) { localStorage.setItem('mdh_users', JSON.stringify(users)); }
function getSession() { return { isLoggedIn: localStorage.getItem('isLoggedIn') === 'true', userName: localStorage.getItem('userName') || '', userRole: localStorage.getItem('userRole') || '' }; }

// ── Register a new user ───────────────────────────────────────
function mdhRegister(name, email, password, role) {
    const users = getUsers();
    // Check if email already registered
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { ok: false, error: 'This email is already registered. Please log in instead.' };
    }
    const user = {
        id: Date.now().toString(),
        name,
        email: email.toLowerCase(),
        password, // plain text for frontend-only (swap with hash when backend added)
        role,
        joined: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    users.push(user);
    saveUsers(users);
    return { ok: true, user };
}

// ── Log in an existing user ───────────────────────────────────
function mdhLogin(email, password) {
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
        return { ok: false, error: 'No account found with this email. Please sign up first.' };
    }
    if (user.password !== password) {
        return { ok: false, error: 'Incorrect password. Please try again.' };
    }
    return { ok: true, user };
}

// ── Start session ─────────────────────────────────────────────
function mdhStartSession(user) {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userName', user.name);
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('userRole', user.role);
}

// ── End session ───────────────────────────────────────────────
function mdhLogout() {
    // Clear localStorage session
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    // CRITICAL: also clear sessionStorage backup so persistSession()
    // cannot silently restore the session after an explicit logout
    sessionStorage.removeItem('mdh_bak');
    // Mark that the user deliberately logged out
    sessionStorage.setItem('mdh_logged_out', 'true');
}

// ── Portal map ────────────────────────────────────────────────
const PORTAL_MAP = {
    student: { url: 'student-dashboard.html', icon: '🎓', label: 'Student Dashboard' },
    researcher: { url: 'professor-dashboard.html', icon: '🔬', label: 'Researcher Dashboard' },
    admin: { url: 'admin.html', icon: '🛡️', label: 'Admin Dashboard' }
};

// ── Show inline error message ─────────────────────────────────
function showAuthError(containerId, message) {
    let el = document.getElementById(containerId);
    if (!el) {
        el = document.createElement('div');
        el.id = containerId;
        el.style.cssText = `
            background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #ef4444;
            border-radius:7px;padding:11px 14px;margin-bottom:14px;
            font-size:.88rem;color:#b91c1c;font-weight:500;display:flex;gap:8px;align-items:flex-start;
        `;
    }
    el.innerHTML = `<span>⚠️</span><span>${message}</span>`;
    el.style.display = 'flex';
    return el;
}

function clearAuthError(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.style.display = 'none';
}

// ═══════════════════════════════════════════════════════════════
//  NAV BAR AUTH STATE  (used on index, about, research, upload)
//  Updated to target floating pill dock elements
// ═══════════════════════════════════════════════════════════════
function initNavAuth() {
    const navAuthBtn = document.getElementById('nav-auth-btn');      // dock login button
    const navUserInfo = document.getElementById('dock-user-info');    // dock user info wrapper
    const navUsername = document.getElementById('dock-username');     // dock username chip
    const navLogoutBtn = document.getElementById('dock-logout-btn');   // dock logout btn
    const dockDashBtn = document.getElementById('dock-dash-btn');     // dock dashboard link

    if (!navAuthBtn) return;

    function refreshNav() {
        const { isLoggedIn, userName, userRole } = getSession();
        if (isLoggedIn) {
            navAuthBtn.style.display = 'none';
            if (navUserInfo) navUserInfo.style.display = 'flex';
            if (navUsername) navUsername.textContent = '👤 ' + userName;
            if (dockDashBtn) {
                const map = { student: 'student-dashboard.html', researcher: 'professor-dashboard.html', admin: 'admin.html' };
                const labels = { student: '🎓 My Dashboard', researcher: '🔬 My Dashboard', admin: '🛡️ Admin Panel' };
                dockDashBtn.href = map[userRole] || 'index.html';
                dockDashBtn.textContent = labels[userRole] || 'My Dashboard';
                dockDashBtn.style.display = '';
            }
        } else {
            navAuthBtn.style.display = '';
            if (navUserInfo) navUserInfo.style.display = 'none';
            if (dockDashBtn) dockDashBtn.style.display = 'none';
        }
    }

    navLogoutBtn && navLogoutBtn.addEventListener('click', () => {
        mdhLogout();
        refreshNav();
        // Hide portal section and welcome banner on logout
        const portalSection = document.getElementById('portal-section');
        const heroWelcome = document.getElementById('hero-welcome');
        const heroActions = document.querySelector('.hero-actions');
        const heroBadge = document.querySelector('.hero-badge');
        if (portalSection) portalSection.classList.remove('visible');
        if (heroWelcome) heroWelcome.classList.remove('visible');
        if (heroActions) heroActions.style.display = '';
        if (heroBadge) heroBadge.style.display = '';
    });
    refreshNav();
    return refreshNav;
}

// ═══════════════════════════════════════════════════════════════
//  PORTAL DROPDOWN  (shared across pages)
// ═══════════════════════════════════════════════════════════════
function initPortalDropdown() {
    const portalBtn = document.getElementById('portal-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    if (!portalBtn || !dropdownMenu) return;

    const arrow = portalBtn.querySelector('.arrow');

    portalBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = dropdownMenu.classList.toggle('active');
        if (arrow) arrow.style.transform = isActive ? 'rotate(180deg)' : 'rotate(0deg)';
        portalBtn.setAttribute('aria-expanded', isActive);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.portal-dropdown')) {
            dropdownMenu.classList.remove('active');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
            portalBtn.setAttribute('aria-expanded', 'false');
        }
    });

    dropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            dropdownMenu.classList.remove('active');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
            portalBtn.setAttribute('aria-expanded', 'false');
        });
    });
}

// ═══════════════════════════════════════════════════════════════
//  AUTH MODAL  (index.html / about.html / research.html)
//  The modal has Login + Signup tabs.
// ═══════════════════════════════════════════════════════════════
function initAuthModal(onLoginSuccess) {
    const modal = document.getElementById('auth-modal');
    const closeBtn = document.getElementById('auth-close');
    const navAuthBtn = document.getElementById('nav-auth-btn');
    if (!modal) return;

    const tabBtns = Array.from(modal.querySelectorAll('.tab-btn'));
    const forms = Array.from(modal.querySelectorAll('.auth-form'));

    function openModal(defaultTab) {
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        // Switch to requested tab
        if (defaultTab) {
            tabBtns.forEach(b => b.classList.toggle('active', b.dataset.target === defaultTab));
            forms.forEach(f => f.classList.toggle('active', f.id === defaultTab));
        }
        const firstInput = modal.querySelector('.auth-form.active input');
        if (firstInput) firstInput.focus();
    }

    function closeModal() {
        modal.setAttribute('aria-hidden', 'true');
        modal.classList.remove('open');
        document.body.style.overflow = '';
        clearAuthError('modal-login-error');
        clearAuthError('modal-signup-error');
    }

    // Only bind nav button if the role-picker modal is NOT present (index.html uses initRoleAuthModal instead)
    const hasRolePicker = !!document.getElementById('modal-step-role');
    navAuthBtn && !hasRolePicker && navAuthBtn.addEventListener('click', () => openModal());
    closeBtn && closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            forms.forEach(f => f.classList.remove('active'));
            const target = document.getElementById(btn.dataset.target);
            if (target) target.classList.add('active');
        });
    });

    // Password toggles
    ['login', 'signup'].forEach(prefix => {
        const toggle = document.getElementById(prefix + '-toggle');
        const input = document.getElementById(prefix + '-password');
        if (toggle && input) {
            toggle.addEventListener('click', () => {
                const isText = input.type === 'text';
                input.type = isText ? 'password' : 'text';
                toggle.textContent = isText ? 'Show' : 'Hide';
            });
        }
    });

    // ── LOGIN form ────────────────────────────────────────────
    const loginForm = document.getElementById('login');
    loginForm && loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        clearAuthError('modal-login-error');
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const result = mdhLogin(email, password);

        if (!result.ok) {
            const errEl = showAuthError('modal-login-error', result.error);
            // Insert error before the submit button
            const submitBtn = this.querySelector('button[type=submit]');
            this.insertBefore(errEl, submitBtn);
            return;
        }

        mdhStartSession(result.user);
        this.reset();
        closeModal();
        if (onLoginSuccess) onLoginSuccess(result.user);
    });

    // ── SIGNUP form ───────────────────────────────────────────
    const signupForm = document.getElementById('signup');
    signupForm && signupForm.addEventListener('submit', function (e) {
        e.preventDefault();
        clearAuthError('modal-signup-error');
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const role = document.getElementById('signup-role').value;

        const result = mdhRegister(name, email, password, role);
        if (!result.ok) {
            const errEl = showAuthError('modal-signup-error', result.error);
            const submitBtn = this.querySelector('button[type=submit]');
            this.insertBefore(errEl, submitBtn);
            return;
        }

        mdhStartSession(result.user);
        this.reset();
        closeModal();
        if (onLoginSuccess) onLoginSuccess(result.user);

        // Hide portal dropdown immediately after signup
        const portalWrap = document.querySelector('.portal-dropdown');
        if (portalWrap) portalWrap.style.display = 'none';

        // Redirect to correct portal
        const portal = PORTAL_MAP[role];
        if (portal) setTimeout(() => { window.location.href = portal.url; }, 300);
    });

    // Expose openModal so other code can open it with a specific tab
    return { openModal, closeModal };
}

// ═══════════════════════════════════════════════════════════════
//  INLINE GATE FORMS  (student-dashboard, professor-dashboard,
//                       admin, upload)
//  These forms live directly on the page (not in a modal).
// ═══════════════════════════════════════════════════════════════
function initGateForms(options) {
    /*
      options = {
        requiredRole:   'student' | 'researcher' | 'admin' | null (any),
        onGrantAccess:  function(user) — called when auth succeeds,
        onDenyAccess:   function()     — called on logout / not logged in
      }
    */
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    if (!loginForm && !signupForm) return;

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            const target = document.getElementById(btn.dataset.target);
            if (target) target.classList.add('active');
        });
    });

    // Password toggles
    ['login', 'signup'].forEach(prefix => {
        const toggle = document.getElementById(prefix + '-toggle');
        const input = document.getElementById(prefix + '-password');
        if (toggle && input) {
            toggle.addEventListener('click', () => {
                const isText = input.type === 'text';
                input.type = isText ? 'password' : 'text';
                toggle.textContent = isText ? 'Show' : 'Hide';
            });
        }
    });

    // ── LOGIN ─────────────────────────────────────────────────
    loginForm && loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        clearAuthError('gate-login-error');
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const result = mdhLogin(email, password);

        if (!result.ok) {
            const errEl = showAuthError('gate-login-error', result.error);
            const submitBtn = this.querySelector('button[type=submit]');
            this.insertBefore(errEl, submitBtn);
            return;
        }

        // Role check — e.g. student portal should not admit admins
        if (options.requiredRole && result.user.role !== options.requiredRole) {
            const roleLabels = { student: 'Student', researcher: 'Researcher', admin: 'Admin' };
            const errEl = showAuthError('gate-login-error',
                `This portal is for ${roleLabels[options.requiredRole]}s only. Your account is registered as a ${roleLabels[result.user.role] || result.user.role}. Please go to the correct portal.`
            );
            const submitBtn = this.querySelector('button[type=submit]');
            this.insertBefore(errEl, submitBtn);
            return;
        }

        mdhStartSession(result.user);
        this.reset();
        if (options.onGrantAccess) options.onGrantAccess(result.user);
    });

    // ── SIGNUP ────────────────────────────────────────────────
    signupForm && signupForm.addEventListener('submit', function (e) {
        e.preventDefault();
        clearAuthError('gate-signup-error');
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        // Role comes from the select if present, otherwise from options
        const roleSelect = document.getElementById('signup-role');
        const role = roleSelect ? roleSelect.value : (options.requiredRole || 'student');

        // If role is locked to portal and user picks wrong role (shouldn't happen but safety check)
        if (options.requiredRole && role !== options.requiredRole) {
            const errEl = showAuthError('gate-signup-error',
                `Please sign up on the correct portal for your role.`
            );
            const submitBtn = this.querySelector('button[type=submit]');
            this.insertBefore(errEl, submitBtn);
            return;
        }

        const result = mdhRegister(name, email, password, role);
        if (!result.ok) {
            const errEl = showAuthError('gate-signup-error', result.error);
            const submitBtn = this.querySelector('button[type=submit]');
            this.insertBefore(errEl, submitBtn);
            return;
        }

        mdhStartSession(result.user);
        this.reset();
        if (options.onGrantAccess) options.onGrantAccess(result.user);
    });
}

// ── Auto-init on DOMContentLoaded ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    seedDefaultUsers(); // ensure default test accounts always exist
    persistSession();   // restore session if localStorage was cleared
    initPortalDropdown();
});

// ═══════════════════════════════════════════════════════════════
//  DEFAULT SEED USERS
//  These are always available so you never need to re-signup.
//  ┌──────────────┬────────────────────────┬──────────────┐
//  │ Role         │ Email                  │ Password     │
//  ├──────────────┼────────────────────────┼──────────────┤
//  │ Admin        │ admin@meddoc.com       │ admin123     │
//  │ Researcher   │ professor@meddoc.com   │ prof123      │
//  │ Student      │ student@meddoc.com     │ student123   │
//  └──────────────┴────────────────────────┴──────────────┘
// ═══════════════════════════════════════════════════════════════
function seedDefaultUsers() {
    const defaults = [
        { id: 'seed_admin', name: 'Admin', email: 'admin@meddoc.com', password: 'admin123', role: 'admin', joined: 'Jan 1, 2026' },
        { id: 'seed_prof', name: 'Professor', email: 'professor@meddoc.com', password: 'prof123', role: 'researcher', joined: 'Jan 1, 2026' },
        { id: 'seed_student', name: 'Student', email: 'student@meddoc.com', password: 'student123', role: 'student', joined: 'Jan 1, 2026' },
    ];
    const users = getUsers();
    let changed = false;
    defaults.forEach(def => {
        if (!users.find(u => u.email.toLowerCase() === def.email.toLowerCase())) {
            users.push(def);
            changed = true;
        }
    });
    if (changed) saveUsers(users);
}

// ── Session persistence across page reloads ───────────────────
// Keeps a sessionStorage backup so the user stays logged in
// for the entire browser session even if localStorage is cleared.
function persistSession() {
    const live = localStorage.getItem('isLoggedIn');
    // If the user explicitly logged out, sessionStorage backup was already
    // wiped by mdhLogout(). We must NOT restore from backup in that case.
    // We use a separate flag 'mdh_logged_out' to detect intentional logout.
    const wasLoggedOut = sessionStorage.getItem('mdh_logged_out') === 'true';

    if (live === 'true') {
        // Active session — back up to sessionStorage so it survives page refreshes
        sessionStorage.removeItem('mdh_logged_out'); // clear any stale logout flag
        sessionStorage.setItem('mdh_bak', JSON.stringify({
            isLoggedIn: 'true',
            userName: localStorage.getItem('userName') || '',
            userEmail: localStorage.getItem('userEmail') || '',
            userRole: localStorage.getItem('userRole') || '',
        }));
    } else if (!wasLoggedOut) {
        // localStorage was cleared (e.g. browser quirk) but user did NOT
        // explicitly log out — safely restore from session backup
        try {
            const bak = JSON.parse(sessionStorage.getItem('mdh_bak') || 'null');
            if (bak && bak.isLoggedIn === 'true' && bak.userName) {
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userName', bak.userName);
                localStorage.setItem('userEmail', bak.userEmail || '');
                localStorage.setItem('userRole', bak.userRole || '');
            }
        } catch (e) { }
    }
}