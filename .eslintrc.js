module.exports = {
	parser: '@typescript-eslint/parser', // Specifies the ESLint parser
	plugins: ['prettier'],
	extends: [
		'plugin:@typescript-eslint/recommended',
		'plugin:prettier/recommended',
		'plugin:import/errors',
		'plugin:import/warnings',
		'plugin:import/typescript',
	],
	parserOptions: {
		ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
		sourceType: 'module', // Allows for the use of imports
	},
	rules: {
		// Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
		'prettier/prettier': ['error'],
		'no-var': 'warn',
		'prefer-const': 'warn',
		'prefer-rest-params': 'warn',
		'@typescript-eslint/no-inferrable-types': 'warn',
		'@typescript-eslint/ban-types': 'warn',
		'@typescript-eslint/no-empty-function': 'warn',
		'@typescript-eslint/ban-ts-comment': 'warn',
		'@typescript-eslint/explicit-function-return-type': 'off',
		'@typescript-eslint/camelcase': 'off', // both segment and google are fond of this
		'@typescript-eslint/no-use-before-define': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-var-requires': 'off',
		'padding-line-between-statements': [
			'error',
			{ blankLine: 'always', prev: '*', next: 'return' },
			{ blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
			{ blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
			{ blankLine: 'always', prev: 'directive', next: '*' },
			{ blankLine: 'any', prev: 'directive', next: 'directive' },
		],
	},
};
