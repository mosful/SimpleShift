document.addEventListener('DOMContentLoaded', () => {
    const personNameInput = document.getElementById('personName');
    const addPersonBtn = document.getElementById('addPerson');
    const clearPeopleBtn = document.getElementById('clearPeople');
    const peopleList = document.getElementById('peopleList');

    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const totalDaysSpan = document.getElementById('totalDays');

    const generateScheduleBtn = document.getElementById('generateSchedule');
    const rescheduleBtn = document.getElementById('reschedule');
    const clearExclusionsBtn = document.getElementById('clearExclusions');
    const exportCsvBtn = document.getElementById('exportCsv');
    const copyTextBtn = document.getElementById('copyText');
    const scheduleTableContainer = document.getElementById('scheduleTable');

    let people = Storage.getData('people') || [];
    let schedule = Storage.getData('schedule') || {};
    let currentlyEditingCell = null;

    function renderPeople() {
        peopleList.innerHTML = '';
        people.forEach(person => {
            const li = document.createElement('li');
            li.textContent = person.name;
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '刪除';
            deleteBtn.classList.add('delete-person');
            deleteBtn.dataset.id = person.id;
            deleteBtn.addEventListener('click', () => deletePerson(person.id));
            li.appendChild(deleteBtn);
            peopleList.appendChild(li);
        });
        renderJointWorshipDates();
        renderPersonExclusions();
        renderSchedule();
    }

    function addPerson() {
        const name = personNameInput.value.trim();
        if (name && !people.some(p => p.name === name)) {
            const newPerson = { id: `p${Date.now()}`, name: name };
            people.push(newPerson);
            Storage.setData('people', people);
            personNameInput.value = '';
            renderPeople();
        } else if (name) {
            alert('此姓名已存在。');
        }
    }

    function deletePerson(id) {
        people = people.filter(p => p.id !== id);
        Storage.setData('people', people);
        const excludeDates = Storage.getData('excludeDates') || {};
        delete excludeDates[id];
        Storage.setData('excludeDates', excludeDates);
        renderPeople();
    }

    function clearPeople() {
        if (confirm('確定要清空所有人員嗎？此操作無法復原。')) {
            people = [];
            Storage.setData('people', []);
            Storage.setData('excludeDates', {});
            Storage.setData('jointWorshipDates', []);
            Storage.setData('schedule', {});
            schedule = {};
            renderPeople();
        }
    }

    function updateDateRange() {
        const startValue = startDateInput.value;
        const endValue = endDateInput.value;

        if (startValue && endValue) {
            const start = new Date(startValue);
            const end = new Date(endValue);

            if (start <= end) {
                const dates = getDatesInRange(start, end);
                const sundayCount = dates.filter(d => d.getDay() === 0).length;
                totalDaysSpan.textContent = sundayCount;
            } else {
                totalDaysSpan.textContent = 0;
            }
        } else {
            totalDaysSpan.textContent = 0;
        }
        renderJointWorshipDates();
        renderPersonExclusions();
    }

    function renderJointWorshipDates() {
        const excludeDatesContainer = document.getElementById('excludeDates');
        excludeDatesContainer.innerHTML = '';
        const start = startDateInput.value;
        const end = endDateInput.value;

        if (!start || !end || new Date(start) > new Date(end) || people.length === 0) {
            return;
        }

        const dates = getDatesInRange(new Date(start), new Date(end));
        const sundays = dates.filter(d => d.getDay() === 0);

        if (sundays.length === 0) {
            return;
        }

        const jointWorshipDates = Storage.getData('jointWorshipDates') || [];

        const sundaysByMonth = sundays.reduce((acc, date) => {
            const month = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
            if (!acc[month]) {
                acc[month] = [];
            }
            acc[month].push(date);
            return acc;
        }, {});

        for (const month in sundaysByMonth) {
            const monthHeader = document.createElement('h4');
            monthHeader.textContent = month.replace('-', '年') + '月';
            excludeDatesContainer.appendChild(monthHeader);

            const gridContainer = document.createElement('div');
            gridContainer.classList.add('date-grid');

            sundaysByMonth[month].forEach(date => {
                const dateString = date.toISOString().split('T')[0];
                const monthStr = String(date.getMonth() + 1).padStart(2, '0');
                const dayStr = String(date.getDate()).padStart(2, '0');

                const wrapper = document.createElement('div');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `joint-${dateString}`;
                checkbox.dataset.date = dateString;
                checkbox.checked = jointWorshipDates.includes(dateString);
                checkbox.addEventListener('change', handleJointWorshipChange);

                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.textContent = `${monthStr}/${dayStr}`;

                wrapper.appendChild(checkbox);
                wrapper.appendChild(label);
                gridContainer.appendChild(wrapper);
            });

            excludeDatesContainer.appendChild(gridContainer);
        }
    }

    function renderPersonExclusions() {
        const personExclusionsContainer = document.getElementById('personExclusions');
        personExclusionsContainer.innerHTML = '';
        const start = startDateInput.value;
        const end = endDateInput.value;

        if (!start || !end || new Date(start) > new Date(end) || people.length === 0) {
            return;
        }

        const dates = getDatesInRange(new Date(start), new Date(end));
        const sundays = dates.filter(d => d.getDay() === 0);

        if (sundays.length === 0) {
            return;
        }

        const excludeDates = Storage.getData('excludeDates') || {};

        sundays.forEach(date => {
            const dateString = date.toISOString().split('T')[0];
            const row = document.createElement('div');
            row.classList.add('person-exclusion-row');

            const label = document.createElement('label');
            label.textContent = dateString;
            label.htmlFor = `exclude-select-${dateString}`;

            const select = document.createElement('select');
            select.multiple = true;
            select.id = `exclude-select-${dateString}`;
            select.dataset.date = dateString;

            people.forEach(person => {
                const option = document.createElement('option');
                option.value = person.id;
                option.textContent = person.name;
                if (excludeDates[person.id] && excludeDates[person.id].includes(dateString)) {
                    option.selected = true;
                }
                select.appendChild(option);
            });

            select.addEventListener('change', handleExcludeChange);

            row.appendChild(label);
            row.appendChild(select);
            personExclusionsContainer.appendChild(row);
        });
    }

    function handleJointWorshipChange(event) {
        const { date } = event.target.dataset;
        const isChecked = event.target.checked;
        let jointWorshipDates = Storage.getData('jointWorshipDates') || [];

        if (isChecked) {
            if (!jointWorshipDates.includes(date)) {
                jointWorshipDates.push(date);
            }
        } else {
            jointWorshipDates = jointWorshipDates.filter(d => d !== date);
        }
        Storage.setData('jointWorshipDates', jointWorshipDates);
    }

    function handleExcludeChange(event) {
        const selectElement = event.target;
        const date = selectElement.dataset.date;
        const selectedPersonIds = Array.from(selectElement.selectedOptions).map(opt => opt.value);
        const excludeDates = Storage.getData('excludeDates') || {};

        // Update based on new selection
        people.forEach(person => {
            if (!excludeDates[person.id]) {
                excludeDates[person.id] = [];
            }

            const isSelected = selectedPersonIds.includes(person.id);
            const isExcluded = excludeDates[person.id].includes(date);

            if (isSelected && !isExcluded) {
                // Add to exclusion
                excludeDates[person.id].push(date);
            } else if (!isSelected && isExcluded) {
                // Remove from exclusion
                excludeDates[person.id] = excludeDates[person.id].filter(d => d !== date);
            }
        });

        Storage.setData('excludeDates', excludeDates);
    }

    function clearExclusions() {
        if (confirm('確定要清除所有人員的排除日期設定嗎？')) {
            Storage.setData('excludeDates', {});
            renderPersonExclusions();
            alert('所有排除日期設定已被清除。');
        }
    }

    function generateSchedule() {
        const settings = {
            startDate: startDateInput.value,
            endDate: endDateInput.value
        };

        if (!settings.startDate || !settings.endDate || new Date(settings.startDate) > new Date(settings.endDate)) {
            alert('請設定有效的日期區間。');
            return;
        }

        if (people.length === 0) {
            alert('請先新增人員。');
            return;
        }

        const excludeDates = Storage.getData('excludeDates') || {};
        const jointWorshipDates = Storage.getData('jointWorshipDates') || [];
        schedule = Scheduler.generate(people, settings, excludeDates, jointWorshipDates);
        Storage.setData('schedule', schedule);
        renderSchedule();
    }

    function reschedule() {
        if (confirm('確定要清除目前的排班結果嗎？')) {
            schedule = {};
            Storage.setData('schedule', {});
            renderSchedule();
        }
    }

    function editCell(e) {
        if (currentlyEditingCell) {
            saveCellEdit(); // Save any other cell that is currently being edited
        }
        currentlyEditingCell = e.target;
        const cell = currentlyEditingCell;
        const date = cell.dataset.date;
        const session = cell.dataset.session;

        if (!date || !session) return;

        const currentNames = schedule[date][session] || schedule[date] || [];
        
        cell.innerHTML = '';
        const select = document.createElement('select');
        select.multiple = true;

        people.forEach(person => {
            const option = document.createElement('option');
            option.value = person.name; // Using name directly for simplicity
            option.textContent = person.name;
            if (currentNames.includes(person.name)) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        select.addEventListener('blur', saveCellEdit);
        select.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveCellEdit();
            }
        });

        cell.appendChild(select);
        select.focus();
    }

    function saveCellEdit() {
        if (!currentlyEditingCell) return;

        const cell = currentlyEditingCell;
        const select = cell.querySelector('select');
        if (!select) return;

        const date = cell.dataset.date;
        const session = cell.dataset.session;

        const selectedNames = Array.from(select.selectedOptions).map(opt => opt.value);

        if (session === 'joint') {
            schedule[date] = selectedNames;
        } else {
            schedule[date][session] = selectedNames;
        }

        Storage.setData('schedule', schedule);
        currentlyEditingCell = null;
        renderSchedule(); // Redraw the whole table
    }

    function cancelCellEdit() {
        if (!currentlyEditingCell) return;
        currentlyEditingCell = null;
        renderSchedule();
    }

    function renderSchedule() {
        scheduleTableContainer.innerHTML = '';
        const dates = Object.keys(schedule).sort();

        if (dates.length === 0) {
            document.getElementById('schedule-container').style.display = 'none';
            return;
        }
        document.getElementById('schedule-container').style.display = 'block';

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>日期</th><th>第一堂</th><th>第二堂</th>';
        thead.appendChild(headerRow);

        dates.forEach(date => {
            const row = document.createElement('tr');
            const dateCell = document.createElement('td');
            dateCell.textContent = date;

            const session1Cell = document.createElement('td');
            const session2Cell = document.createElement('td');

            const daySchedule = schedule[date];
            if (Array.isArray(daySchedule)) { // Joint Worship
                session1Cell.textContent = daySchedule.join(', ');
                session1Cell.dataset.date = date;
                session1Cell.dataset.session = 'joint';
                session1Cell.addEventListener('click', editCell);

                session2Cell.textContent = '（聯合禮拜）';
                session2Cell.classList.add('readonly');
            } else { // Regular Sunday
                session1Cell.textContent = daySchedule.session1.join(', ');
                session1Cell.dataset.date = date;
                session1Cell.dataset.session = 'session1';
                session1Cell.addEventListener('click', editCell);

                session2Cell.textContent = daySchedule.session2.join(', ');
                session2Cell.dataset.date = date;
                session2Cell.dataset.session = 'session2';
                session2Cell.addEventListener('click', editCell);
            }

            row.appendChild(dateCell);
            row.appendChild(session1Cell);
            row.appendChild(session2Cell);
            tbody.appendChild(row);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        scheduleTableContainer.appendChild(table);
    }

    function exportCsv() {
        const dates = Object.keys(schedule).sort();
        if (dates.length === 0) return;

        let csvContent = 'data:text/csv;charset=utf-8,日期,第一堂,第二堂\n';
        dates.forEach(date => {
            const daySchedule = schedule[date];
            let row;
            if (Array.isArray(daySchedule)) {
                row = [date, '"' + daySchedule.join(', ') + '"', '"（聯合禮拜）"'];
            } else {
                row = [date, '"' + daySchedule.session1.join(', ') + '"', '"' + daySchedule.session2.join(', ') + '"'];
            }
            csvContent += row.join(',') + '\n';
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'schedule.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function copyText() {
        const dates = Object.keys(schedule).sort();
        if (dates.length === 0) return;

        let textContent = '日期\t第一堂\t第二堂\n';
        dates.forEach(date => {
            const daySchedule = schedule[date];
            if (Array.isArray(daySchedule)) {
                textContent += `${date}\t${daySchedule.join(', ')}\t（聯合禮拜）\n`;
            } else {
                textContent += `${date}\t${daySchedule.session1.join(', ')}\t${daySchedule.session2.join(', ')}\n`;
            }
        });

        navigator.clipboard.writeText(textContent).then(() => {
            alert('排班表已複製到剪貼簿。');
        }, () => {
            alert('複製失敗。');
        });
    }

    function getDatesInRange(startDate, endDate) {
        const dates = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates;
    }

    addPersonBtn.addEventListener('click', addPerson);
    clearPeopleBtn.addEventListener('click', clearPeople);
    startDateInput.addEventListener('change', updateDateRange);
    endDateInput.addEventListener('change', updateDateRange);
    generateScheduleBtn.addEventListener('click', generateSchedule);
    rescheduleBtn.addEventListener('click', reschedule);
    clearExclusionsBtn.addEventListener('click', clearExclusions);
    exportCsvBtn.addEventListener('click', exportCsv);
    copyTextBtn.addEventListener('click', copyText);

    // Initial render
    const savedSettings = Storage.getData('settings');
    if (savedSettings) {
        startDateInput.value = savedSettings.startDate || '';
        endDateInput.value = savedSettings.endDate || '';
    }

    renderPeople();
    updateDateRange();
    renderSchedule();

    window.addEventListener('beforeunload', () => {
        const settings = {
            startDate: startDateInput.value,
            endDate: endDateInput.value
        };
        Storage.setData('settings', settings);
    });
});
