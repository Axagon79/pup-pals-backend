module.exports = {
    "root": true,
    "env": {
        "node": true,
        "es2021": true,
        "jest": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:react/recommended"  // Aggiungi supporto React
    ],
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module",
        "ecmaFeatures": {
            "jsx": true
        }
    },
    "plugins": [
        "react"  // Aggiungi plugin React
    ],
    "rules": {
        "no-unused-vars": "warn",  // Avvisa invece di disabilitare completamente
        "no-undef": "warn",
        "indent": ["warn", 4],  // 4 spazi di indentazione
        "linebreak-style": ["warn", "unix"],
        "quotes": ["warn", "single"],  // Preferisci singoli apici
        "semi": ["warn", "always"]  // Richiedi sempre punto e virgola
    },
    "settings": {
        "react": {
            "version": "detect"  // Rileva automaticamente la versione di React
        }
    },
    "ignorePatterns": [
        "node_modules/",
        "dist/",
        "build/",
        "**/dataconnect-generated/**",
        "functions/dataconnect-generated/"
    ]
}