module.exports =  {
  parser:  '@typescript-eslint/parser',
  extends:  [
    'plugin:@typescript-eslint/recommended'
  ],
  parserOptions:  {
    ecmaVersion:  2020,
    sourceType:  'module',
  },
  rules: {
    indent: ['error', 2],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/camelcase': 'off',
  },
};
