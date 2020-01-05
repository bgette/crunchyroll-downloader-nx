#!/usr/bin/env node

// build requirements
const pkg = require('../package.json');
const fs = require('fs-extra');
const modulesCleanup = require('removeNPMAbsolutePaths');
const { compile } = require('nexe');

// main
(async function(){
    const buildStr = `${pkg.name}-${pkg.version}`;
    const acceptableBuilds = ['win64','linux64','macos64'];
    const buildType = process.argv[2];
    if(!acceptableBuilds.includes(buildType)){
        console.error('[ERROR] unknown build type!');
        process.exit();
    }
    await modulesCleanup('.');
    if(!fs.existsSync('./_builds')){
        fs.mkdirSync('./_builds');
    }
    const buildFull = `${buildStr}-${buildType}`;
    const buildDir = `./_builds/${buildFull}`;
    if(fs.existsSync(buildDir)){
        fs.removeSync(buildDir);
    }
    fs.mkdirSync(buildDir);
    fs.mkdirSync(`${buildDir}/bin`);
    fs.mkdirSync(`${buildDir}/config`);
    fs.mkdirSync(`${buildDir}/fonts`);
    fs.mkdirSync(`${buildDir}/videos`);
    fs.mkdirSync(`${buildDir}/videos/_trash`);
    const buildConfig = {
        input: './crunchy.js',
        output: `${buildDir}/${pkg.short_name}`,
        target: getTarget(buildType),
        resources: [
            './modules/module.*',
        ],
    };
    console.log(`[Build] Build configuration: ${buildFull}`);
    await compile(buildConfig);
    if(fs.existsSync('./bin/ffmpeg')){
        fs.copySync('./bin/ffmpeg', `${buildDir}/bin/ffmpeg`);
    }
    if(fs.existsSync('./bin/ffmpeg.exe')){
        fs.copySync('./bin/ffmpeg.exe', `${buildDir}/bin/ffmpeg.exe`);
    }
    if(fs.existsSync('./bin/mkvmerge')){
        fs.copySync('./bin/mkvmerge', `${buildDir}/bin/mkvmerge`);
    }
    if(fs.existsSync('./bin/mkvmerge.exe')){
        fs.copySync('./bin/mkvmerge.exe', `${buildDir}/bin/mkvmerge.exe`);
    }
    fs.copySync('./config/bin-path.yml', `${buildDir}/config/bin-path.yml`);
    fs.copySync('./config/cli-defaults.yml', `${buildDir}/config/cli-defaults.yml`);
    fs.copySync('./config/dir-path.yml', `${buildDir}/config/dir-path.yml`);
    fs.copySync('./cmd-here.bat', `${buildDir}/cmd-here.bat`);
    fs.copySync('./docs/', `${buildDir}/docs/`);
    fs.copySync('./LICENSE.md', `${buildDir}/docs/LICENSE.md`);
}());

function getTarget(bt){
    switch(bt){
        case 'win64':
            return 'windows-x64';
        case 'linux64':
            return 'linux-x64';
        case 'macos64':
            return 'macos-x64';
        default:
            return 'windows-x64';
    }
}
