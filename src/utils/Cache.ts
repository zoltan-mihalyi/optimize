import Map = require("./Map");

class Cache<K,V> {
    private map:Map<K,V> = new Map<K,V>();

    constructor(private create:(key:K) => V) {
    }

    get(key:K) {
        if (this.map.has(key)) {
            return this.map.get(key);
        } else {
            const value = this.create(key);
            this.map.set(key, value);
            return value;
        }
    }
}

export = Cache;