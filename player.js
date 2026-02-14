/**
 * Spielername (Gast-Modus wie papergames.io)
 * Nur Name im LocalStorage – keine Anmeldung, kein Passwort.
 */

const playerStorageKey = 'easyboardgames_nickname';

const player = {
    getNickname() {
        try {
            const name = localStorage.getItem(playerStorageKey);
            return (name && name.trim()) ? name.trim() : 'Gast';
        } catch (_) {
            return 'Gast';
        }
    },

    setNickname(name) {
        const trimmed = (name && typeof name === 'string') ? name.trim() : '';
        if (trimmed) {
            localStorage.setItem(playerStorageKey, trimmed);
        } else {
            localStorage.removeItem(playerStorageKey);
        }
        return trimmed || 'Gast';
    }
};
