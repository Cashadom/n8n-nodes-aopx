module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
    'n8n-nodes-base',
  ],
  extends: [
    'plugin:n8n-nodes-base/community',
  ],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    'n8n-nodes-base/node-param-default-missing': 'off',
  },
};
