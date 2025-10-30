const Scheduler = {
    generate(people, settings, excludeDates, jointWorshipDates) {
        const { startDate, endDate } = settings;
        const schedule = {};
        const dates = getDatesInRange(new Date(startDate), new Date(endDate));
        const sundays = dates.filter(d => d.getDay() === 0);

        const shiftCounts = people.reduce((acc, person) => {
            acc[person.id] = 0;
            return acc;
        }, {});

        sundays.forEach(date => {
            const dateString = date.toISOString().split('T')[0];
            const isJointWorship = jointWorshipDates.includes(dateString);

            let availablePeople = people.filter(person => {
                const personExcludes = excludeDates[person.id] || [];
                return !personExcludes.includes(dateString);
            });

            // Sort available people by their current shift count
            availablePeople.sort((a, b) => shiftCounts[a.id] - shiftCounts[b.id]);

            if (isJointWorship) {
                // Joint Worship: needs 2 people
                schedule[dateString] = [];
                const assignedPeople = availablePeople.slice(0, 2);
                assignedPeople.forEach(p => {
                    schedule[dateString].push(p.name);
                    shiftCounts[p.id]++;
                });
            } else {
                // Regular Sunday: needs 4 people (2 per session)
                schedule[dateString] = { session1: [], session2: [] };
                if (availablePeople.length >= 4) {
                    const session1People = availablePeople.slice(0, 2);
                    const session2People = availablePeople.slice(2, 4);

                    session1People.forEach(p => {
                        schedule[dateString].session1.push(p.name);
                        shiftCounts[p.id]++;
                    });
                    session2People.forEach(p => {
                        schedule[dateString].session2.push(p.name);
                        shiftCounts[p.id]++;
                    });
                } else {
                    // Not enough people, assign as many as possible to session1 first
                    const session1People = availablePeople.slice(0, 2);
                    const session2People = availablePeople.slice(2, 4);

                     session1People.forEach(p => {
                        schedule[dateString].session1.push(p.name);
                        shiftCounts[p.id]++;
                    });
                     session2People.forEach(p => {
                        schedule[dateString].session2.push(p.name);
                        shiftCounts[p.id]++;
                    });
                }
            }
        });

        return schedule;
    }
};

function getDatesInRange(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}
