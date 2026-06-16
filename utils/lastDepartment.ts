const KEY = 'hidden_last_department_id';

export function setLastDepartmentId(id: string): void {
    try {
        localStorage.setItem(KEY, id);
    } catch {
        /* ignore */
    }
}

export function getLastDepartmentId(): string {
    try {
        return localStorage.getItem(KEY) || 'valle-del-cauca';
    } catch {
        return 'valle-del-cauca';
    }
}
