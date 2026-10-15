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
    let isWorkerPreviewMode = false;
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

    // Przełącznik widoku admina na widok pracownika
    window.toggleAdminViewMode = function() {
        isWorkerPreviewMode = !isWorkerPreviewMode;
        const btn = document.getElementById('adminToggleViewBtn');
        if (btn) {
            btn.textContent = isWorkerPreviewMode ? '🔓 Wyłącz podgląd (Wróć do Admina)' : '👁️ Podgląd jako pracownik';
            btn.style.background = isWorkerPreviewMode ? 'var(--accent-green)' : 'var(--accent-purple)';
        }
        applyUIPermissions();
        switchView('homeView');
    };

    function applyUIPermissions() {
        const roleBadge = document.getElementById('roleBadge');
        const employeeFilterGroup = document.getElementById('employeeFilterGroup');
        const adminUsersCard = document.getElementById('adminUsersCard');
        const adminQuotesCard = document.getElementById('adminQuotesCard');
        const adminToggleViewBtn = document.getElementById('adminToggleViewBtn');

        if (isAdmin) {
            if (adminToggleViewBtn) adminToggleViewBtn.style.display = 'block';

            if (isWorkerPreviewMode) {
                if (roleBadge) {
                    roleBadge.textContent = 'PRACOWNIK (PODGLĄD)';
                    roleBadge.className = 'badge badge-worker';
                }
                if (employeeFilterGroup) employeeFilterGroup.style.display = 'none';
                if (adminUsersCard) adminUsersCard.style.display = 'none';
                if (adminQuotesCard) adminQuotesCard.style.display = 'none';
            } else {
                if (roleBadge) {
                    roleBadge.textContent = 'ADMIN';
                    roleBadge.className = 'badge badge-admin';
                }
                if (employeeFilterGroup) employeeFilterGroup.style.display = 'block';
                if (adminUsersCard) adminUsersCard.style.display = 'block';
                if (adminQuotesCard) adminQuotesCard.style.display = 'block';
                listenToAllUsers();
            }
        } else {
            if (adminToggleViewBtn) adminToggleViewBtn.style.display = 'none';
            if (roleBadge) {
                roleBadge.textContent = 'PRACOWNIK';
                roleBadge.className = 'badge badge-worker';
            }
            if (employeeFilterGroup) employeeFilterGroup.style.display = 'none';
            if (adminUsersCard) adminUsersCard.style.display = 'none';
            if (adminQuotesCard) adminQuotesCard.style.display = 'none';
        }
        renderTable();
    }

    // Ustawienie domyślnych dat na bieżący miesiąc
    function setDefaultDateFilter() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const firstDayStr = `${year}-${month}-01`;
        
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        const lastDayStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

        const filterStartDate = document.getElementById('filterStartDate');
        const filterEndDate = document.getElementById('filterEndDate');

        if (filterStartDate && !filterStartDate.value) filterStartDate.value = firstDayStr;
        if (filterEndDate && !filterEndDate.value) filterEndDate.value = lastDayStr;
    }

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
                        return db.collection('users').get().then(snapshot => {
                            if (snapshot.size >= 4) {
                                throw new Error('Osiągnięto maksymalną liczbę 4 zarejestrowanych użytkowników w systemie. Rejestracja nowych kont jest zablokowana.');
                            }

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
            isWorkerPreviewMode = false;
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

        setDefaultDateFilter();
        applyUIPermissions();

        if (!currentUserProfile.firstName || !currentUserProfile.lastName || currentUserProfile.firstName.trim() === '' || currentUserProfile.lastName.trim() === '') {
            alert('Twoje konto nie posiada uzupełnionego Imienia i Nazwiska. Proszę je uzupełnić, aby kontynuować.');
            switchView('profileView');
        }

        listenToProjects();
        listenToEntries();
    }

    function listenToAllUsers() {
        if (!isAdmin || isWorkerPreviewMode) return;
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
            updateEditProjectSelectOptions();
        });
    }

    function renderProjects() {
        const projectsList = document.getElementById('projectsList');
        const projectSelect = document.getElementById('projectName');
        if (!projectsList || !projectSelect) return;

        projectsList.innerHTML = '';
        projectSelect.innerHTML = '<option value="">-- Wybierz projekt --</option>';

        const canDeleteProjects = isAdmin && !isWorkerPreviewMode;

        globalProjects.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${p.name}</span>
                ${canDeleteProjects ? `<button class="btn-delete" onclick="deleteProject('${p.id}')">Usuń</button>` : ''}
            `;
            projectsList.appendChild(li);

            const option = document.createElement('option');
            option.value = p.name;
            option.textContent = p.name;
            projectSelect.appendChild(option);
        });
    }

    function updateEditProjectSelectOptions() {
        const editProjectSelect = document.getElementById('editProjectName');
        if (!editProjectSelect) return;

        const currentVal = editProjectSelect.value;
        editProjectSelect.innerHTML = '<option value="">-- Wybierz projekt --</option>';

        globalProjects.forEach(p => {
            const option = document.createElement('option');
            option.value = p.name;
            option.textContent = p.name;
            editProjectSelect.appendChild(option);
        });

        editProjectSelect.value = currentVal;
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

            if (isAdmin && !isWorkerPreviewMode) updateEmployeeSelectOptions(Array.from(workersSet));
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
                alert('✅ Wpis został pomyślnie dodany do chmury!');
                // Zostajemy na widoku dodawania godzin, żeby można było dodać kolejne
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

    // LOGIKA EDYCYJNA WPISÓW
    window.openEditModal = function(id) {
        const entry = globalTimeEntries.find(e => e.id === id);
        if (!entry) return;

        document.getElementById('editEntryId').value = entry.id;
        document.getElementById('editActivityType').value = entry.type || 'Praca';
        document.getElementById('editProjectName').value = entry.project || '';
        document.getElementById('editWorkDate').value = entry.date || '';
        document.getElementById('editHoursWorked').value = entry.hours || '';
        document.getElementById('editWorkDescription').value = entry.description || '';

        document.getElementById('editModal').style.display = 'flex';
    };

    window.closeEditModal = function() {
        document.getElementById('editModal').style.display = 'none';
    };

    const editEntryForm = document.getElementById('editEntryForm');
    if (editEntryForm) {
        editEntryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const entryId = document.getElementById('editEntryId').value;
            const activityType = document.getElementById('editActivityType').value;
            const projectSelect = document.getElementById('editProjectName');

            if (activityType === 'Praca' && !projectSelect.value) {
                alert('Wybierz projekt przy rejestrowaniu pracy.');
                return;
            }

            const updatedData = {
                type: activityType,
                project: projectSelect.value || '',
                date: document.getElementById('editWorkDate').value,
                hours: parseFloat(document.getElementById('editHoursWorked').value) || 0,
                description: document.getElementById('editWorkDescription').value.trim()
            };

            db.collection('timeEntries').doc(entryId).update(updatedData).then(() => {
                closeEditModal();
            }).catch(err => {
                alert('Błąd podczas edycji wpisu: ' + err.message);
            });
        });
    }

    function renderTypeBadge(type) {
        switch (type) {
            case 'Praca': return `<span class="badge badge-work">Work</span>`;
            case 'Nadgodziny': return `<span class="badge badge-overtime" style="background: rgba(236, 72, 153, 0.2); color: #f472b6;">Overtime</span>`;
            case 'Urlop wypoczynkowy': return `<span class="badge badge-vacation">Vacation</span>`;
            case 'Urlop rodzicielski': return `<span class="badge badge-parental">Parental</span>`;
            case 'Zwolnienie lekarskie': return `<span class="badge badge-sick">Sick Leave</span>`;
            case 'Święto / Dzień wolny': return `<span class="badge">Holiday</span>`;
            case 'Urlop bezpłatny': return `<span class="badge">Unpaid Leave</span>`;
            default: return `<span class="badge">${type}</span>`;
        }
    }

    function renderTable() {
        const tableBody = document.getElementById('tableBody');
        const totalHoursSpan = document.getElementById('totalHours');
        const filterStartDate = document.getElementById('filterStartDate');
        const filterEndDate = document.getElementById('filterEndDate');
        const empSelect = document.getElementById('employeeSelect');
        const projectFilterSelect = document.getElementById('projectFilterSelect');
        const typeFilterSelect = document.getElementById('typeFilterSelect');

        if (!tableBody || !totalHoursSpan) return;

        const startDate = filterStartDate ? filterStartDate.value : '';
        const endDate = filterEndDate ? filterEndDate.value : '';
        const selectedEmp = empSelect ? empSelect.value : 'ALL';
        const selectedProject = projectFilterSelect ? projectFilterSelect.value : 'ALL';
        const selectedType = typeFilterSelect ? typeFilterSelect.value : 'ALL';

        const effectivelyAdmin = isAdmin && !isWorkerPreviewMode;

        let entriesToRender = globalTimeEntries.filter(entry => {
            if (!effectivelyAdmin) {
                if (!currentUser || entry.userId !== currentUser.uid) {
                    return false;
                }
            } else {
                if (selectedEmp !== 'ALL' && entry.userName !== selectedEmp) return false;
            }

            if (selectedProject !== 'ALL' && entry.project !== selectedProject) return false;
            if (selectedType !== 'ALL' && entry.type !== selectedType) return false;
            
            if (entry.date) {
                if (startDate && entry.date < startDate) return false;
                if (endDate && entry.date > endDate) return false;
            }
            
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
            else if (entry.type === 'Urlop wypoczynkowy' || entry.type === 'Urlop rodzicielski') vacationEntries++;
            else if (entry.type === 'Zwolnienie lekarskie') sickEntries++;

            const canManage = effectivelyAdmin || entry.userId === currentUser.uid;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${entry.userName || 'N/A'}</strong></td>
                <td>${renderTypeBadge(entry.type)}</td>
                <td>${entry.project || '-'}</td>
                <td>${entry.date || '-'}</td>
                <td><strong>${hoursNum} h</strong></td>
                <td>${entry.description || '-'}</td>
                <td class="no-print">
                    ${canManage ? `
                        <button class="btn-edit" onclick="openEditModal('${entry.id}')">Edytuj</button>
                        <button class="btn-delete" onclick="deleteEntry('${entry.id}')">Usuń</button>
                    ` : ''}
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
        if (printMonthName) printMonthName.textContent = (startDate || endDate) ? `${startDate || '...'} do ${endDate || '...'}` : 'All';
        if (printTotalHours) printTotalHours.textContent = `${totalHours} h`;

        const workCount = document.getElementById('workCount');
        const vacationCount = document.getElementById('vacationCount');
        const sickCount = document.getElementById('sickCount');
        if (workCount) workCount.textContent = workEntries;
        if (vacationCount) vacationCount.textContent = vacationEntries;
        if (sickCount) sickCount.textContent = sickEntries;
    }

    const filterStartDate = document.getElementById('filterStartDate');
    const filterEndDate = document.getElementById('filterEndDate');
    const employeeSelect = document.getElementById('employeeSelect');
    const projectFilterSelect = document.getElementById('projectFilterSelect');
    const typeFilterSelect = document.getElementById('typeFilterSelect');
    const resetFilterBtn = document.getElementById('resetFilterBtn');

    if (filterStartDate) filterStartDate.addEventListener('change', renderTable);
    if (filterEndDate) filterEndDate.addEventListener('change', renderTable);
    if (employeeSelect) employeeSelect.addEventListener('change', renderTable);
    if (projectFilterSelect) projectFilterSelect.addEventListener('change', renderTable);
    if (typeFilterSelect) typeFilterSelect.addEventListener('change', renderTable);
    
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', function() {
            setDefaultDateFilter();
            if (employeeSelect) employeeSelect.value = 'ALL';
            if (projectFilterSelect) projectFilterSelect.value = 'ALL';
            if (typeFilterSelect) typeFilterSelect.value = 'ALL';
            renderTable();
        });
    }

    const workDateInput = document.getElementById('workDate');
    const quoteDateInput = document.getElementById('quoteDate');
    const quoteValidityDateInput = document.getElementById('quoteValidityDate');
    
    const todayStr = new Date().toISOString().split('T')[0];
    const validityDate = new Date();
    validityDate.setDate(validityDate.getDate() + 30);
    const validityStr = validityDate.toISOString().split('T')[0];

    if (workDateInput) workDateInput.valueAsDate = new Date();
    if (quoteDateInput) quoteDateInput.value = todayStr;
    if (quoteValidityDateInput) quoteValidityDateInput.value = validityStr;

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
    // LOGIKA MODUŁU OFERT
    // =========================================================================
    
    setTimeout(() => {
        addMaterialRow();
        addLaborRow();
        changeQuoteLanguage();
        toggleCustomColumns();
    }, 500);

    const quoteTranslations = {
        en: {
            subtitle: "Official Price Quote",
            issuerAddressLabel: "Company Address:",
            issuerOrgLabel: "Org. nr:",
            issuerEmailLabel: "Email:",
            issuerPhoneLabel: "Phone:",
            headerTitle: "QUOTE / OFFER",
            quoteNo: "No",
            date: "Date",
            validityText: "Valid until",
            clientLabel: "Client / Company:",
            addressLabel: "Investment Address & Postal Code:",
            clientEmailLabel: "Client Email:",
            clientPhoneLabel: "Client Phone:",
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
            vatTitle: "Add Moms (VAT 25%)",
            vatDesc: "Check to include standard Swedish 25% VAT to the total net amount.",
            rotTitle: "Apply ROT-avdrag deduction (30%)",
            rotDesc: "Deducts 30% from labor costs according to Swedish tax regulations (up to 50,000 SEK limit).",
            sumMaterials: "Materials Sum:",
            sumLabor: "Labor Sum:",
            sumNet: "Net Total:",
            sumVatText: "Moms (VAT 25%):",
            rotDeduction: "ROT Deduction (-30%):",
            grandTotal: "TOTAL AMOUNT:",
            printBtnText: "Drukuj / Zapisz ofertę jako PDF"
        },
        sv: {
            subtitle: "Officiell Offert",
            issuerAddressLabel: "Företagsadress:",
            issuerOrgLabel: "Org. nr:",
            issuerEmailLabel: "E-post:",
            issuerPhoneLabel: "Telefon:",
            headerTitle: "OFFERT",
            quoteNo: "Nr",
            date: "Datum",
            validityText: "Giltig till",
            clientLabel: "Kund / Företag:",
            addressLabel: "Projektadress & Postnummer:",
            clientEmailLabel: "Kund E-post:",
            clientPhoneLabel: "Kund Telefon:",
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
            vatTitle: "Lägg till Moms (25%)",
            vatDesc: "Klicka för att lägga till svensk standard Moms (25%) på nettosumman.",
            rotTitle: "Tillämpa ROT-avdrag (30%)",
            rotDesc: "Drar av 30% på arbetskostnaden enligt Skatteverkets regler (upp till 50 000 SEK per person).",
            sumMaterials: "Summa Material:",
            sumLabor: "Summa Arbete:",
            sumNet: "Nettosumma:",
            sumVatText: "Moms (25%):",
            rotDeduction: "ROT-avdrag (-30%):",
            grandTotal: "ATT BETALA:",
            printBtnText: "Skriv ut / Spara offert som PDF"
        }
    };

    window.changeQuoteLanguage = function() {
        const langSelect = document.getElementById('quoteLangSelect');
        if (!langSelect) return;
        const lang = langSelect.value;
        const t = quoteTranslations[lang];

        document.getElementById('lblSubtitle').textContent = t.subtitle;
        document.getElementById('lblIssuerAddressLabel').textContent = t.issuerAddressLabel;
        document.getElementById('lblIssuerOrgLabel').textContent = t.issuerOrgLabel;
        document.getElementById('lblIssuerEmailLabel').textContent = t.issuerEmailLabel;
        document.getElementById('lblIssuerPhoneLabel').textContent = t.issuerPhoneLabel;
        document.getElementById('lblHeaderTitle').textContent = t.headerTitle;
        document.getElementById('lblQuoteNoText').textContent = t.quoteNo;
        document.getElementById('lblDateText').textContent = t.date;
        document.getElementById('lblValidityText').textContent = t.validityText;
        document.getElementById('lblClientLabel').textContent = t.clientLabel;
        document.getElementById('lblAddressLabel').textContent = t.addressLabel;
        document.getElementById('lblClientEmailLabel').textContent = t.clientEmailLabel;
        document.getElementById('lblClientPhoneLabel').textContent = t.clientPhoneLabel;
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
        document.getElementById('lblVatTitle').textContent = t.vatTitle;
        document.getElementById('lblVatDesc').textContent = t.vatDesc;
        document.getElementById('lblRotTitle').textContent = t.rotTitle;
        document.getElementById('lblRotDesc').textContent = t.rotDesc;
        document.getElementById('lblSumMaterials').textContent = t.sumMaterials;
        document.getElementById('lblSumLabor').textContent = t.sumLabor;
        document.getElementById('lblSumNet').textContent = t.sumNet;
        document.getElementById('lblSumVatText').textContent = t.sumVatText;
        document.getElementById('lblRotDeduction').textContent = t.rotDeduction;
        document.getElementById('lblGrandTotal').innerHTML = `<strong>${t.grandTotal}</strong>`;
        document.getElementById('lblPrintBtnText').textContent = t.printBtnText;
    };

    window.toggleCustomColumns = function() {
        const showQty = document.getElementById('toggleQty').checked;
        const showUnitPrice = document.getElementById('toggleUnitPrice').checked;

        document.querySelectorAll('.col-qty').forEach(el => {
            el.style.display = showQty ? '' : 'none';
        });
        document.querySelectorAll('.col-unit-price').forEach(el => {
            el.style.display = showUnitPrice ? '' : 'none';
        });
    };

    window.addMaterialRow = function() {
        const tbody = document.getElementById('materialsList');
        if (!tbody) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="m-name" placeholder="np. Płyta K-G"></td>
            <td class="col-qty"><input type="number" class="m-qty" value="1" min="0" step="any" oninput="calculateQuoteTotals()"></td>
            <td class="col-qty"><input type="text" class="m-unit" value="szt."></td>
            <td class="col-unit-price"><input type="number" class="m-price" value="0" min="0" step="0.01" oninput="calculateQuoteTotals()"></td>
            <td class="m-total">0.00 SEK</td>
            <td class="no-print"><button class="btn-delete" onclick="this.closest('tr').remove(); calculateQuoteTotals();">&times;</button></td>
        `;
        tbody.appendChild(tr);
        toggleCustomColumns();
        calculateQuoteTotals();
    };

    window.addLaborRow = function() {
        const tbody = document.getElementById('laborList');
        if (!tbody) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="l-name" placeholder="np. Montaż ścianki"></td>
            <td class="col-qty"><input type="number" class="l-qty" value="1" min="0" step="any" oninput="calculateQuoteTotals()"></td>
            <td class="col-qty"><input type="text" class="l-unit" value="rbg"></td>
            <td class="col-unit-price"><input type="number" class="l-price" value="0" min="0" step="0.01" oninput="calculateQuoteTotals()"></td>
            <td class="l-total">0.00 SEK</td>
            <td class="no-print"><button class="btn-delete" onclick="this.closest('tr').remove(); calculateQuoteTotals();">&times;</button></td>
        `;
        tbody.appendChild(tr);
        toggleCustomColumns();
        calculateQuoteTotals();
    };

    window.calculateQuoteTotals = function() {
        let materialsSum = 0;
        document.querySelectorAll('#materialsList tr').forEach(row => {
            const qtyInput = row.querySelector('.m-qty');
            const priceInput = row.querySelector('.m-price');
            
            const qty = qtyInput ? (parseFloat(qtyInput.value) || 0) : 1;
            const price = priceInput ? (parseFloat(priceInput.value) || 0) : 0;
            
            const total = qty * price;
            const totalCell = row.querySelector('.m-total');
            if (totalCell) totalCell.textContent = total.toFixed(2) + ' SEK';
            materialsSum += total;
        });

        let laborSum = 0;
        document.querySelectorAll('#laborList tr').forEach(row => {
            const qtyInput = row.querySelector('.l-qty');
            const priceInput = row.querySelector('.l-price');

            const qty = qtyInput ? (parseFloat(qtyInput.value) || 0) : 1;
            const price = priceInput ? (parseFloat(priceInput.value) || 0) : 0;

            const total = qty * price;
            const totalCell = row.querySelector('.l-total');
            if (totalCell) totalCell.textContent = total.toFixed(2) + ' SEK';
            laborSum += total;
        });

        const netTotal = materialsSum + laborSum;
        let grandTotal = netTotal;

        const vatCheckbox = document.getElementById('vatCheckbox');
        const vatRow = document.getElementById('vatRow');
        let vatAmount = 0;

        if (vatCheckbox && vatCheckbox.checked) {
            if (vatRow) vatRow.style.display = 'flex';
            vatAmount = netTotal * 0.25;
            grandTotal += vatAmount;
            const sumVat = document.getElementById('sumVat');
            if (sumVat) sumVat.textContent = vatAmount.toFixed(2) + ' SEK';
        } else {
            if (vatRow) vatRow.style.display = 'none';
        }

        const rotCheckbox = document.getElementById('rotCheckbox');
        const rotRow = document.getElementById('rotRow');

        if (rotCheckbox && rotCheckbox.checked) {
            if (rotRow) rotRow.style.display = 'flex';
            let laborBase = vatCheckbox && vatCheckbox.checked ? (laborSum * 1.25) : laborSum;
            let rotDiscount = laborBase * 0.30;
            if (rotDiscount > 50000) {
                rotDiscount = 50000;
            }

            const sumRot = document.getElementById('sumRot');
            if (sumRot) sumRot.textContent = '-' + rotDiscount.toFixed(2) + ' SEK';
            grandTotal -= rotDiscount;
        } else {
            if (rotRow) rotRow.style.display = 'none';
        }

        const sumMaterials = document.getElementById('sumMaterials');
        const sumLabor = document.getElementById('sumLabor');
        const sumNet = document.getElementById('sumNet');
        const sumTotal = document.getElementById('sumTotal');

        if (sumMaterials) sumMaterials.textContent = materialsSum.toFixed(2) + ' SEK';
        if (sumLabor) sumLabor.textContent = laborSum.toFixed(2) + ' SEK';
        if (sumNet) sumNet.textContent = netTotal.toFixed(2) + ' SEK';
        if (sumTotal) sumTotal.textContent = grandTotal.toFixed(2) + ' SEK';
    };
});