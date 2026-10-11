document.addEventListener('DOMContentLoaded', function() {
    // =========================================================================
    // KONFIGURACJA FIREBASE
    // =========================================================================
    const firebaseConfig = {
        apiKey: "AIzaSyC8BmS10F1CQ6_tZ5Sg8krurbrNpcrTaCk",
        authDomain: "dmbygg-280c3.firebaseapp.com",
        projectId: "dmbygg-280c3",
        storageBucket: "dmbygg-280c3.firebasestorage.app",
        messagingSenderId: "37818044227",
        appId: "1:37818044227:web:93f123367284037ab629f6",
    };

    const ADMIN_EMAILS = [
        "kacpertt2121@gmail.com",
        "admin2@dmbygg.se",
        "damiantyrka@op.pl"
    ];

    if (typeof firebase === 'undefined') {
        alert('Błąd: Biblioteka Firebase nie została załadowana.');
        return;
    }

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    const auth = firebase.auth();
    const db = firebase.firestore();

    let currentUser = null;
    let currentUserProfile = null;
    let isAdmin = false;
    let globalTimeEntries = [];
    let globalProjects = [];

    // Nawigacja
    window.switchView = function(targetId) {
        const viewSections = document.querySelectorAll('.view-section');
        const homeBtn = document.getElementById('homeBtn');

        viewSections.forEach(sec => sec.classList.remove('active'));
        const targetElement = document.getElementById(targetId);
        if (targetElement) targetElement.classList.add('active');

        if (homeBtn) {
            homeBtn.style.display = (targetId === 'homeView') ? 'none' : 'flex';
        }
    };

    // Obsługa trybu Logowania / Rejestracji
    let isSignUpMode = false;
    const toggleAuthModeBtn = document.getElementById('toggleAuthMode');
    const authTitle = document.getElementById('authTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const signupFields = document.getElementById('signupFields');
    const authFirstName = document.getElementById('authFirstName');
    const authLastName = document.getElementById('authLastName');
    const authPhone = document.getElementById('authPhone');

    if (toggleAuthModeBtn) {
        toggleAuthModeBtn.addEventListener('click', function() {
            isSignUpMode = !isSignUpMode;
            if (authTitle) authTitle.textContent = isSignUpMode ? 'Zarejestruj nowe konto' : 'Zaloguj się do systemu';
            if (authSubmitBtn) authSubmitBtn.textContent = isSignUpMode ? 'Utwórz konto' : 'Zaloguj się';
            this.textContent = isSignUpMode ? 'Masz już konto? Zaloguj się' : 'Nie masz konta? Zarejestruj się';
            
            if (signupFields) signupFields.style.display = isSignUpMode ? 'block' : 'none';
            if (authFirstName) authFirstName.required = isSignUpMode;
            if (authLastName) authLastName.required = isSignUpMode;
            if (authPhone) authPhone.required = isSignUpMode;
        });
    }

    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('authEmail').value.trim();
            const password = document.getElementById('authPassword').value;
            const rememberMe = document.getElementById('rememberMe').checked;

            const persistenceType = rememberMe ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;

            auth.setPersistence(persistenceType)
                .then(() => {
                    if (isSignUpMode) {
                        const firstName = authFirstName.value.trim();
                        const lastName = authLastName.value.trim();
                        const phone = authPhone.value.trim();

                        return auth.createUserWithEmailAndPassword(email, password)
                            .then(cred => {
                                return db.collection('users').doc(cred.user.uid).set({
                                    firstName: firstName,
                                    lastName: lastName,
                                    phone: phone,
                                    email: email,
                                    createdAt: new Date()
                                });
                            })
                            .then(() => {
                                alert('Konto zostało utworzone pomyślnie!');
                            });
                    } else {
                        return auth.signInWithEmailAndPassword(email, password);
                    }
                })
                .catch(err => {
                    alert('Błąd autoryzacji: ' + err.message);
                });
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            auth.signOut();
        });
    }

    // Nasłuchiwanie stanu autoryzacji
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());

            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    currentUserProfile = doc.data();
                } else {
                    currentUserProfile = { firstName: '', lastName: '', phone: '-' };
                }
                initAppUI(user);
            }).catch(err => {
                console.warn("Nie udało się pobrać profilu z bazy:", err);
                currentUserProfile = { firstName: '', lastName: '', phone: '-' };
                initAppUI(user);
            });
        } else {
            currentUser = null;
            currentUserProfile = null;
            isAdmin = false;
            const authView = document.getElementById('authView');
            const mainApp = document.getElementById('mainApp');
            if (authView) authView.style.display = 'block';
            if (mainApp) mainApp.style.display = 'none';
        }
    });

    function initAppUI(user) {
        const profileFirstName = document.getElementById('profileFirstName');
        const profileLastName = document.getElementById('profileLastName');
        const profileEmail = document.getElementById('profileEmail');
        const profilePhone = document.getElementById('profilePhone');

        if (profileEmail) profileEmail.value = user.email;
        if (profilePhone) profilePhone.value = currentUserProfile.phone || '';

        if (profileFirstName) {
            profileFirstName.value = currentUserProfile.firstName || '';
            if (currentUserProfile.firstName) {
                profileFirstName.readOnly = true;
                profileFirstName.style.backgroundColor = '#0b1120';
                profileFirstName.style.color = '#64748b';
                profileFirstName.style.cursor = 'not-allowed';
            } else {
                profileFirstName.readOnly = false;
                profileFirstName.style.backgroundColor = '#0f172a';
                profileFirstName.style.color = '#f8fafc';
                profileFirstName.style.cursor = 'text';
            }
        }

        if (profileLastName) {
            profileLastName.value = currentUserProfile.lastName || '';
            if (currentUserProfile.lastName) {
                profileLastName.readOnly = true;
                profileLastName.style.backgroundColor = '#0b1120';
                profileLastName.style.color = '#64748b';
                profileLastName.style.cursor = 'not-allowed';
            } else {
                profileLastName.readOnly = false;
                profileLastName.style.backgroundColor = '#0f172a';
                profileLastName.style.color = '#f8fafc';
                profileLastName.style.cursor = 'text';
            }
        }

        const authView = document.getElementById('authView');
        const mainApp = document.getElementById('mainApp');
        const currentUserName = document.getElementById('currentUserName');
        const currentUserEmail = document.getElementById('currentUserEmail');

        if (authView) authView.style.display = 'none';
        if (mainApp) mainApp.style.display = 'block';

        const fullNameDisplay = `${currentUserProfile.firstName || 'Brak'} ${currentUserProfile.lastName || 'danych'}`;
        if (currentUserName) currentUserName.textContent = fullNameDisplay;
        if (currentUserEmail) currentUserEmail.textContent = user.email;

        const roleBadge = document.getElementById('roleBadge');
        const employeeFilterGroup = document.getElementById('employeeFilterGroup');
        const adminUsersCard = document.getElementById('adminUsersCard');
        const adminQuotesCard = document.getElementById('adminQuotesCard');

        if (roleBadge) {
            if (isAdmin) {
                roleBadge.textContent = 'ADMIN';
                roleBadge.className = 'badge badge-admin';
                if (employeeFilterGroup) employeeFilterGroup.style.display = 'block';
                if (adminUsersCard) adminUsersCard.style.display = 'block';
                if (adminQuotesCard) adminQuotesCard.style.display = 'block';
                listenToAllUsers();
            } else {
                roleBadge.textContent = 'PRACOWNIK';
                roleBadge.className = 'badge badge-worker';
                if (employeeFilterGroup) employeeFilterGroup.style.display = 'none';
                if (adminUsersCard) adminUsersCard.style.display = 'none';
                if (adminQuotesCard) adminQuotesCard.style.display = 'none';
            }
        }

        if (!currentUserProfile.firstName || !currentUserProfile.lastName || currentUserProfile.firstName.trim() === '' || currentUserProfile.lastName.trim() === '') {
            alert('Twoje konto nie posiada uzupełnionego Imienia i Nazwiska. Proszę je uzupełnić, aby kontynuować.');
            switchView('profileView');
        }

        listenToProjects();
        listenToEntries();
    }

    function listenToAllUsers() {
        if (!isAdmin) return;
        db.collection('users').onSnapshot(snapshot => {
            const usersList = document.getElementById('allUsersList');
            if (!usersList) return;
            usersList.innerHTML = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                const li = document.createElement('li');
                li.innerHTML = `
                    <div>
                        <strong>${data.firstName || 'Brak imienia'} ${data.lastName || 'Brak nazwiska'}</strong><br>
                        <small style="color: var(--text-secondary);">${data.email || 'Brak e-mail'} | Tel: ${data.phone || '-'}</small>
                    </div>
                `;
                usersList.appendChild(li);
            });
        });
    }

    // Zapis edycji profilu
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const fNameInput = document.getElementById('profileFirstName');
            const lNameInput = document.getElementById('profileLastName');
            const phoneInput = document.getElementById('profilePhone');

            if (!currentUser) return;

            const updateData = {
                phone: phoneInput ? phoneInput.value.trim() : '',
                email: currentUser.email
            };

            if (fNameInput && !fNameInput.readOnly && fNameInput.value.trim() !== '') {
                updateData.firstName = fNameInput.value.trim();
            } else if (currentUserProfile && currentUserProfile.firstName) {
                updateData.firstName = currentUserProfile.firstName;
            }

            if (lNameInput && !lNameInput.readOnly && lNameInput.value.trim() !== '') {
                updateData.lastName = lNameInput.value.trim();
            } else if (currentUserProfile && currentUserProfile.lastName) {
                updateData.lastName = currentUserProfile.lastName;
            }

            db.collection('users').doc(currentUser.uid).set(updateData, { merge: true }).then(() => {
                if (updateData.firstName) currentUserProfile.firstName = updateData.firstName;
                if (updateData.lastName) currentUserProfile.lastName = updateData.lastName;
                currentUserProfile.phone = updateData.phone;

                alert('Dane profilu zostały pomyślnie zaktualizowane!');
                window.location.reload();
            }).catch(err => {
                alert('Błąd podczas aktualizacji profilu: ' + err.message);
            });
        });
    }

    // Projekty
    function listenToProjects() {
        db.collection('projects').onSnapshot(snapshot => {
            globalProjects = [];
            snapshot.forEach(doc => {
                globalProjects.push({ id: doc.id, ...doc.data() });
            });
            renderProjects();
            updateProjectFilterOptions();
        });
    }

    function renderProjects() {
        const projectsList = document.getElementById('projectsList');
        const projectSelect = document.getElementById('projectName');
        if (!projectsList || !projectSelect) return;

        projectsList.innerHTML = '';
        projectSelect.innerHTML = '<option value="">-- Wybierz projekt --</option>';

        globalProjects.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${p.name}</span>
                ${isAdmin ? `<button class="btn-delete" onclick="deleteProject('${p.id}')">Usuń</button>` : ''}
            `;
            projectsList.appendChild(li);

            const option = document.createElement('option');
            option.value = p.name;
            option.textContent = p.name;
            projectSelect.appendChild(option);
        });
    }

    function updateProjectFilterOptions() {
        const projectFilterSelect = document.getElementById('projectFilterSelect');
        if (!projectFilterSelect) return;

        const currentVal = projectFilterSelect.value;
        projectFilterSelect.innerHTML = '<option value="ALL">-- Wszystkie Projekty --</option>';

        globalProjects.forEach(p => {
            const option = document.createElement('option');
            option.value = p.name;
            option.textContent = p.name;
            projectFilterSelect.appendChild(option);
        });

        projectFilterSelect.value = currentVal;
    }

    window.deleteProject = function(id) {
        if (confirm('Czy na pewno chcesz usunąć projekt?')) {
            db.collection('projects').doc(id).delete();
        }
    };

    const projectForm = document.getElementById('projectForm');
    if (projectForm) {
        projectForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const nameInput = document.getElementById('newProjectName');
            const name = nameInput ? nameInput.value.trim() : '';
            if (name) {
                db.collection('projects').add({ name, createdAt: new Date() });
                if (nameInput) nameInput.value = '';
                switchView('addView');
            }
        });
    }

    // Pobieranie wpisów z Firebase
    function listenToEntries() {
        db.collection('timeEntries').onSnapshot(snapshot => {
            globalTimeEntries = [];
            const workersSet = new Set();

            snapshot.forEach(doc => {
                const data = doc.data();
                data.id = doc.id;
                globalTimeEntries.push(data);
                if (data.userName) workersSet.add(data.userName);
            });

            globalTimeEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

            if (isAdmin) updateEmployeeSelectOptions(Array.from(workersSet));
            renderTable();
        }, err => {
            console.error("Błąd podczas pobierania wpisów z bazy:", err);
        });
    }

    function updateEmployeeSelectOptions(workers) {
        const empSelect = document.getElementById('employeeSelect');
        if (!empSelect) return;

        const currentVal = empSelect.value;
        empSelect.innerHTML = '<option value="ALL">-- Wszyscy --</option>';

        workers.forEach(w => {
            const option = document.createElement('option');
            option.value = w;
            option.textContent = w;
            empSelect.appendChild(option);
        });

        empSelect.value = currentVal;
    }

    const timeForm = document.getElementById('timeForm');
    if (timeForm) {
        timeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const activityType = document.getElementById('activityType').value;
            const projectSelect = document.getElementById('projectName');

            if (activityType === 'Praca' && !projectSelect.value) {
                alert('Wybierz projekt przy rejestrowaniu pracy.');
                return;
            }

            const fullName = `${currentUserProfile.firstName} ${currentUserProfile.lastName}`.trim();

            const newEntry = {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                userName: fullName || currentUser.email,
                userPhone: currentUserProfile.phone || '-',
                type: activityType,
                project: projectSelect.value || '',
                date: document.getElementById('workDate').value,
                hours: parseFloat(document.getElementById('hoursWorked').value) || 0,
                description: document.getElementById('workDescription').value.trim(),
                createdAt: new Date()
            };

            db.collection('timeEntries').add(newEntry).then(() => {
                document.getElementById('hoursWorked').value = '';
                document.getElementById('workDescription').value = '';
                projectSelect.value = '';
                switchView('reportView');
            }).catch(err => {
                alert('Błąd podczas zapisywania wpisu: ' + err.message);
            });
        });
    }

    window.deleteEntry = function(id) {
        if (confirm('Czy na pewno usunąć ten wpis?')) {
            db.collection('timeEntries').doc(id).delete();
        }
    };

    function renderTypeBadge(type) {
        switch (type) {
            case 'Praca': return `<span class="badge badge-work">Work</span>`;
            case 'Nadgodziny': return `<span class="badge badge-overtime" style="background: rgba(236, 72, 153, 0.2); color: #f472b6;">Overtime</span>`;
            case 'Urlop wypoczynkowy': return `<span class="badge badge-vacation">Vacation</span>`;
            case 'Zwolnienie lekarskie': return `<span class="badge badge-sick">Sick Leave</span>`;
            case 'Święto / Dzień wolny': return `<span class="badge">Holiday</span>`;
            case 'Urlop bezpłatny': return `<span class="badge">Unpaid Leave</span>`;
            default: return `<span class="badge">${type}</span>`;
        }
    }

    function updateMonthSelect() {
        const monthSelect = document.getElementById('monthSelect');
        if (!monthSelect) return;

        const monthsSet = new Set();
        globalTimeEntries.forEach(entry => {
            if (entry.date) monthsSet.add(entry.date.substring(0, 7));
        });

        const currentSelected = monthSelect.value;
        monthSelect.innerHTML = '<option value="">-- Wszystkie --</option>';

        Array.from(monthsSet).sort().reverse().forEach(ym => {
            const option = document.createElement('option');
            option.value = ym;
            option.textContent = ym;
            monthSelect.appendChild(option);
        });

        monthSelect.value = currentSelected;
    }

    function renderTable() {
        const tableBody = document.getElementById('tableBody');
        const totalHoursSpan = document.getElementById('totalHours');
        const monthSelect = document.getElementById('monthSelect');
        const empSelect = document.getElementById('employeeSelect');
        const projectFilterSelect = document.getElementById('projectFilterSelect');
        const typeFilterSelect = document.getElementById('typeFilterSelect');

        if (!tableBody || !totalHoursSpan) return;

        updateMonthSelect();

        const selectedMonth = monthSelect ? monthSelect.value : '';
        const selectedEmp = empSelect ? empSelect.value : 'ALL';
        const selectedProject = projectFilterSelect ? projectFilterSelect.value : 'ALL';
        const selectedType = typeFilterSelect ? typeFilterSelect.value : 'ALL';

        let entriesToRender = globalTimeEntries.filter(entry => {
            if (!isAdmin && entry.userId !== currentUser.uid) return false;
            if (isAdmin && selectedEmp !== 'ALL' && entry.userName !== selectedEmp) return false;
            if (selectedProject !== 'ALL' && entry.project !== selectedProject) return false;
            if (selectedType !== 'ALL' && entry.type !== selectedType) return false;
            if (selectedMonth && entry.date && !entry.date.startsWith(selectedMonth)) return false;
            return true;
        });

        tableBody.innerHTML = '';
        let totalHours = 0;
        let workEntries = 0;
        let vacationEntries = 0;
        let sickEntries = 0;

        entriesToRender.forEach(entry => {
            const hoursNum = parseFloat(entry.hours) || 0;
            totalHours += hoursNum;

            if (entry.type === 'Praca') workEntries++;
            else if (entry.type === 'Urlop wypoczynkowy') vacationEntries++;
            else if (entry.type === 'Zwolnienie lekarskie') sickEntries++;

            const canDelete = isAdmin || entry.userId === currentUser.uid;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${entry.userName || 'N/A'}</strong></td>
                <td>${renderTypeBadge(entry.type)}</td>
                <td>${entry.project || '-'}</td>
                <td>${entry.date || '-'}</td>
                <td><strong>${hoursNum} h</strong></td>
                <td>${entry.description || '-'}</td>
                <td class="no-print">
                    ${canDelete ? `<button class="btn-delete" onclick="deleteEntry('${entry.id}')">Usuń</button>` : ''}
                </td>
            `;
            tableBody.appendChild(row);
        });

        totalHoursSpan.textContent = `${totalHours} h`;
        
        const printProjectName = document.getElementById('printProjectName');
        const printTypeName = document.getElementById('printTypeName');
        const printMonthName = document.getElementById('printMonthName');
        const printTotalHours = document.getElementById('printTotalHours');
        
        if (printProjectName) printProjectName.textContent = selectedProject === 'ALL' ? 'All' : selectedProject;
        if (printTypeName) printTypeName.textContent = selectedType === 'ALL' ? 'All' : selectedType;
        if (printMonthName) printMonthName.textContent = selectedMonth || 'All';
        if (printTotalHours) printTotalHours.textContent = `${totalHours} h`;

        const workCount = document.getElementById('workCount');
        const vacationCount = document.getElementById('vacationCount');
        const sickCount = document.getElementById('sickCount');
        if (workCount) workCount.textContent = workEntries;
        if (vacationCount) vacationCount.textContent = vacationEntries;
        if (sickCount) sickCount.textContent = sickEntries;
    }

    const monthSelect = document.getElementById('monthSelect');
    const employeeSelect = document.getElementById('employeeSelect');
    const projectFilterSelect = document.getElementById('projectFilterSelect');
    const typeFilterSelect = document.getElementById('typeFilterSelect');
    const resetFilterBtn = document.getElementById('resetFilterBtn');

    if (monthSelect) monthSelect.addEventListener('change', renderTable);
    if (employeeSelect) employeeSelect.addEventListener('change', renderTable);
    if (projectFilterSelect) projectFilterSelect.addEventListener('change', renderTable);
    if (typeFilterSelect) typeFilterSelect.addEventListener('change', renderTable);
    
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', function() {
            if (monthSelect) monthSelect.value = '';
            if (employeeSelect) employeeSelect.value = 'ALL';
            if (projectFilterSelect) projectFilterSelect.value = 'ALL';
            if (typeFilterSelect) typeFilterSelect.value = 'ALL';
            renderTable();
        });
    }

    const workDateInput = document.getElementById('workDate');
    const quoteDateInput = document.getElementById('quoteDate');
    const todayStr = new Date().toISOString().split('T')[0];
    if (workDateInput) workDateInput.valueAsDate = new Date();
    if (quoteDateInput) quoteDateInput.value = todayStr;

    // DRUK / ZAPIS DO PDF (Raport godzin)
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', function() {
            const tableBody = document.getElementById('tableBody');
            if (!tableBody || tableBody.children.length === 0) {
                alert('Brak wpisów w tabeli do wyeksportowania dla wybranych filtrów!');
                return;
            }
            window.print();
        });
    }

    // =========================================================================
    // LOGIKA MODUŁU OFERT (Angielski / Szwedzki + Dynamiczne wiersze + ROT)
    // =========================================================================
    
    setTimeout(() => {
        addMaterialRow();
        addLaborRow();
        changeQuoteLanguage(); // Ustawienie domyślnych etykiet (angielski)
    }, 500);

    // Słownik tłumaczeń dla ofert (Angielski / Szwedzki)
    const quoteTranslations = {
        en: {
            subtitle: "Official Price Quote",
            headerTitle: "QUOTE / OFFER",
            quoteNo: "No",
            date: "Date",
            clientLabel: "Client / Company:",
            addressLabel: "Investment Address:",
            materialsHeader: "1. Materials",
            thMaterialName: "Material Name / Description",
            thQty: "Qty",
            thUnit: "Unit",
            thUnitPrice: "Unit Price (SEK)",
            thTotal: "Total (SEK)",
            action: "Action",
            btnAddMaterial: "+ Add Material",
            laborHeader: "2. Labor / Works",
            thLaborDesc: "Work Scope / Description",
            thHoursQty: "Hours/Qty",
            thLaborUnit: "Unit",
            thRate: "Rate (SEK)",
            thLaborTotal: "Total (SEK)",
            btnAddLabor: "+ Add Labor Position",
            rotTitle: "Apply ROT-avdrag deduction (30%)",
            rotDesc: "Deducts 30% from labor costs according to Swedish tax regulations (up to 50,000 SEK limit).",
            sumMaterials: "Materials Sum:",
            sumLabor: "Labor Sum:",
            sumVat: "Moms (VAT 25%):",
            rotDeduction: "ROT Deduction (-30%):",
            grandTotal: "TOTAL GROSS:",
            printBtnText: "Drukuj / Zapisz ofertę jako PDF"
        },
        sv: {
            subtitle: "Officiell Offert",
            headerTitle: "OFFERT",
            quoteNo: "Nr",
            date: "Datum",
            clientLabel: "Kund / Företag:",
            addressLabel: "Projektadress:",
            materialsHeader: "1. Material",
            thMaterialName: "Materialnamn / Beskrivning",
            thQty: "Antal",
            thUnit: "Enhet",
            thUnitPrice: "Á-pris (SEK)",
            thTotal: "Totalt (SEK)",
            action: "Åtgärd",
            btnAddMaterial: "+ Lägg till material",
            laborHeader: "2. Arbete / Arbetstid",
            thLaborDesc: "Arbetsbeskrivning / Omfattning",
            thHoursQty: "Timmar/Antal",
            thLaborUnit: "Enhet",
            thRate: "Timpris (SEK)",
            thLaborTotal: "Totalt (SEK)",
            btnAddLabor: "+ Lägg till arbete",
            rotTitle: "Tillämpa ROT-avdrag (30%)",
            rotDesc: "Drar av 30% på arbetskostnaden enligt Skatteverkets regler (upp till 50 000 SEK per person).",
            sumMaterials: "Summa Material:",
            sumLabor: "Summa Arbete:",
            sumVat: "Moms (25%):",
            rotDeduction: "ROT-avdrag (-30%):",
            grandTotal: "ATT BETALA BRUTTO:",
            printBtnText: "Skriv ut / Spara offert som PDF"
        }
    };

    window.changeQuoteLanguage = function() {
        const langSelect = document.getElementById('quoteLangSelect');
        if (!langSelect) return;
        const lang = langSelect.value;
        const t = quoteTranslations[lang];

        document.getElementById('lblSubtitle').textContent = t.subtitle;
        document.getElementById('lblHeaderTitle').textContent = t.headerTitle;
        document.getElementById('lblQuoteNoText').textContent = t.quoteNo;
        document.getElementById('lblDateText').textContent = t.date;
        document.getElementById('lblClientLabel').textContent = t.clientLabel;
        document.getElementById('lblAddressLabel').textContent = t.addressLabel;
        document.getElementById('lblMaterialsHeader').textContent = t.materialsHeader;
        document.getElementById('thMaterialName').textContent = t.thMaterialName;
        document.getElementById('thQty').textContent = t.thQty;
        document.getElementById('thUnit').textContent = t.thUnit;
        document.getElementById('thUnitPrice').textContent = t.thUnitPrice;
        document.getElementById('thTotal').textContent = t.thTotal;
        document.getElementById('btnAddMaterial').textContent = t.btnAddMaterial;
        document.getElementById('lblLaborHeader').textContent = t.laborHeader;
        document.getElementById('thLaborDesc').textContent = t.thLaborDesc;
        document.getElementById('thHoursQty').textContent = t.thHoursQty;
        document.getElementById('thLaborUnit').textContent = t.thLaborUnit;
        document.getElementById('thRate').textContent = t.thRate;
        document.getElementById('thLaborTotal').textContent = t.thLaborTotal;
        document.getElementById('btnAddLabor').textContent = t.btnAddLabor;
        document.getElementById('lblRotTitle').textContent = t.rotTitle;
        document.getElementById('lblRotDesc').textContent = t.rotDesc;
        document.getElementById('lblSumMaterials').textContent = t.sumMaterials;
        document.getElementById('lblSumLabor').textContent = t.sumLabor;
        document.getElementById('lblSumVat').textContent = t.sumVat;
        document.getElementById('lblRotDeduction').textContent = t.rotDeduction;
        document.getElementById('lblGrandTotal').innerHTML = `<strong>${t.grandTotal}</strong>`;
        document.getElementById('lblPrintBtnText').textContent = t.printBtnText;
    };

    window.addMaterialRow = function() {
        const tbody = document.getElementById('materialsList');
        if (!tbody) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="m-name" placeholder="np. Płyta K-G"></td>
            <td><input type="number" class="m-qty" value="1" min="0" step="any" oninput="calculateQuoteTotals()"></td>
            <td><input type="text" class="m-unit" value="szt."></td>
            <td><input type="number" class="m-price" value="0" min="0" step="0.01" oninput="calculateQuoteTotals()"></td>
            <td class="m-total">0.00 SEK</td>
            <td class="no-print"><button class="btn-delete" onclick="this.closest('tr').remove(); calculateQuoteTotals();">&times;</button></td>
        `;
        tbody.appendChild(tr);
        calculateQuoteTotals();
    };

    window.addLaborRow = function() {
        const tbody = document.getElementById('laborList');
        if (!tbody) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="l-name" placeholder="np. Montaż ścianki"></td>
            <td><input type="number" class="l-qty" value="1" min="0" step="any" oninput="calculateQuoteTotals()"></td>
            <td><input type="text" class="l-unit" value="rbg"></td>
            <td><input type="number" class="l-price" value="0" min="0" step="0.01" oninput="calculateQuoteTotals()"></td>
            <td class="l-total">0.00 SEK</td>
            <td class="no-print"><button class="btn-delete" onclick="this.closest('tr').remove(); calculateQuoteTotals();">&times;</button></td>
        `;
        tbody.appendChild(tr);
        calculateQuoteTotals();
    };

    window.calculateQuoteTotals = function() {
        let materialsSum = 0;
        document.querySelectorAll('#materialsList tr').forEach(row => {
            const qty = parseFloat(row.querySelector('.m-qty').value) || 0;
            const price = parseFloat(row.querySelector('.m-price').value) || 0;
            const total = qty * price;
            const totalCell = row.querySelector('.m-total');
            if (totalCell) totalCell.textContent = total.toFixed(2) + ' SEK';
            materialsSum += total;
        });

        let laborSum = 0;
        document.querySelectorAll('#laborList tr').forEach(row => {
            const qty = parseFloat(row.querySelector('.l-qty').value) || 0;
            const price = parseFloat(row.querySelector('.l-price').value) || 0;
            const total = qty * price;
            const totalCell = row.querySelector('.l-total');
            if (totalCell) totalCell.textContent = total.toFixed(2) + ' SEK';
            laborSum += total;
        });

        const netTotal = materialsSum + laborSum;
        const vatAmount = netTotal * 0.25; // Szwedzki Moms 25%
        let grandTotal = netTotal + vatAmount;

        const rotCheckbox = document.getElementById('rotCheckbox');
        const rotRow = document.getElementById('rotRow');

        if (rotCheckbox && rotCheckbox.checked) {
            if (rotRow) rotRow.style.display = 'flex';
            let laborGross = laborSum * 1.25;
            let rotDiscount = laborGross * 0.30;
            if (rotDiscount > 50000) {
                rotDiscount = 50000; // Limit 50 000 SEK
            }

            const sumRot = document.getElementById('sumRot');
            if (sumRot) sumRot.textContent = '-' + rotDiscount.toFixed(2) + ' SEK';
            grandTotal -= rotDiscount;
        } else {
            if (rotRow) rotRow.style.display = 'none';
        }

        const sumMaterials = document.getElementById('sumMaterials');
        const sumLabor = document.getElementById('sumLabor');
        const sumVat = document.getElementById('sumVat');
        const sumTotal = document.getElementById('sumTotal');

        if (sumMaterials) sumMaterials.textContent = materialsSum.toFixed(2) + ' SEK';
        if (sumLabor) sumLabor.textContent = laborSum.toFixed(2) + ' SEK';
        if (sumVat) sumVat.textContent = vatAmount.toFixed(2) + ' SEK';
        if (sumTotal) sumTotal.textContent = grandTotal.toFixed(2) + ' SEK';
    };
});