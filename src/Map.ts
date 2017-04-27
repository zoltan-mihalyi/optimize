class Map<K, V> {
    private keys:K[] = [];
    private values:V[] = [];

    set(key:K, value:V) {
        if (this.has(key)) {
            throw new Error('Already has the key!');
        }

        this.keys.push(key);
        this.values.push(value);
    }

    get(key:K):V {
        const idx = this.keys.indexOf(key);
        if (idx === -1) {
            throw new Error('Does not contain!');
        }
        return this.values[idx];
    }

    has(key:K):boolean {
        return this.keys.indexOf(key) !== -1;
    }

    remove(key:K) {
        const idx = this.keys.indexOf(key);
        if (idx === -1) {
            return;
        }
        this.keys.splice(idx, 1);
        this.values.splice(idx, 1);
    }

    each(callback:(key:K, value:V) => void) {
        const length = this.keys.length;
        for (let i = 0; i < length; i++) {
            callback(this.keys[i], this.values[i]);
        }
    }

    setOrUpdate(key:K, value:V) {
        const idx = this.keys.indexOf(key);
        if (idx === -1) {
            this.set(key, value);
        } else {
            this.values[idx] = value;
        }
    }
}

export = Map;