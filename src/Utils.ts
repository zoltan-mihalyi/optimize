export function createUnusedName(base:string, isUsed:(name:string) => boolean) {
    let name = base;
    let i = 2;
    while (isUsed(name)) {
        name = base + i;
        i++;
    }
    return name;
}