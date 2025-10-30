const Storage = {
    getData(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },
    setData(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    clear() {
        localStorage.clear();
    }
};
