class Map<K,V> {
    private keys:K[] = [];
    private values:V[] = [];

    set(key:K, value:V) {
        if (this.has(key)) {
            throw new Error('Already has the key!');
        }

        this.keys.push(key);
        this.values.push(value);
    }

    get(key:K) {
        const idx = this.keys.indexOf(key);
        if (idx === -1) {
            throw new Error('Does not contain!');
        }
        return this.values[idx];
    }

    has(key:K) {
        return this.keys.indexOf(key) !== -1;
    }
}

export = Map;