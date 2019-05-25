import svelte from 'rollup-plugin-svelte'
import resolve from 'rollup-plugin-node-resolve'

module.exports = {
  input: 'dev/main',
  output: {
    name: 'app',
    file: 'dev/public/bundle.js',
    format: 'iife'
  },
  plugins: [
    svelte(),
    resolve()
  ]
}
