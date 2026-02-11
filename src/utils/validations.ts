export const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

export const validateCPF = (cpf: string): boolean => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false; // Check for all same digits

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
        sum = sum + parseInt(cleaned.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;

    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum = sum + parseInt(cleaned.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;

    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

    return true;
};

export const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 11;
};

export const validatePassword = (password: string): boolean => {
    // > 6 chars, letters, numbers, 1 special char, 1 uppercase letter (optional but recommended, user asked for "1 letra" which usually implies at least one letter, and "1 caractere especial")
    // User request: "maiores que 6 caracteres usarem letras números, 1 caractere especial e 1 letra"
    // Interpretation: > 6 length, has digits, has special char, has letters.

    if (password.length <= 6) return false;

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return hasLetter && hasNumber && hasSpecial;
};

export const validateBirthDate = (dateStr: string): { valid: boolean; message: string } => {
    if (!dateStr || dateStr.length < 10) return { valid: false, message: 'Data de nascimento incompleta.' };
    const parts = dateStr.split('/');
    if (parts.length !== 3) return { valid: false, message: 'Formato inválido. Use DD/MM/AAAA.' };

    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return { valid: false, message: 'Data inválida.' };

    const currentYear = new Date().getFullYear();
    const minYear = 1900;
    const maxYear = currentYear - 10;

    if (year < minYear || year > maxYear) {
        return { valid: false, message: `Ano deve ser entre ${minYear} e ${maxYear}.` };
    }
    if (month < 1 || month > 12) return { valid: false, message: 'Mês deve ser entre 01 e 12.' };
    if (day < 1 || day > 31) return { valid: false, message: 'Dia deve ser entre 01 e 31.' };

    // Check valid date
    const testDate = new Date(year, month - 1, day);
    if (testDate.getDate() !== day || testDate.getMonth() !== month - 1) {
        return { valid: false, message: 'Data inválida para o mês informado.' };
    }

    return { valid: true, message: '' };
};

export const validateDueDay = (day: string): { valid: boolean; message: string } => {
    if (!day) return { valid: true, message: '' }; // Optional field
    const num = parseInt(day);
    if (isNaN(num) || num < 1 || num > 31) {
        return { valid: false, message: 'Dia de vencimento deve ser entre 1 e 31.' };
    }
    return { valid: true, message: '' };
};

export const validateWeight = (weight: string): { valid: boolean; message: string } => {
    if (!weight) return { valid: true, message: '' }; // Optional field
    const num = parseFloat(weight);
    if (isNaN(num) || num < 1 || num > 500) {
        return { valid: false, message: 'Peso deve ser entre 1 e 500 kg.' };
    }
    return { valid: true, message: '' };
};
