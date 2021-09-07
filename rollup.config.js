import typescript from '@rollup/plugin-typescript';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
//import scss from 'rollup-plugin-scss';

const isProd = (process.env.BUILD === 'production');

const banner = 
`/*
THIS IS A GENERATED/BUNDLED FILE BY ROLLUP
if you want to view the source visit the plugins github repository
*/
`;

export default {
  input: './src/main.ts',
  output: {
    dir: '.',
    sourcemap: 'inline',
    sourcemapExcludeSources: isProd,
    format: 'cjs',
    exports: 'default',
    banner,
  },
  external: ['obsidian'],
  plugins: [
    typescript(),
    nodeResolve({browser: true}),
    commonjs(),
    //scss({ output: 'styles.css', sass: require('sass'), watch: './src'})
  ]
};

// can't put comments in json so this goes HERE INSTEAD
// "rollup-plugin-scss": "^3.0.0",
// "sass": "^1.39.0",
// ^ these two weren't doing their JOB so they get put in the COMMENT ZONE