// Idempotent: run after `npx cap add android`. Installs Kotlin sources, manifest, sounds and Gradle Kotlin support.
import fs from 'node:fs'; import path from 'node:path';
const PKG = 'com.godzillamode.studyforge', A = 'android', OV = 'android-overlay';
const java = path.join(A, 'app/src/main/java', ...PKG.split('.')), raw = path.join(A, 'app/src/main/res/raw');
fs.mkdirSync(java, { recursive: true }); fs.mkdirSync(raw, { recursive: true });
for (const f of fs.readdirSync(`${OV}/kotlin`)) fs.copyFileSync(`${OV}/kotlin/${f}`, path.join(java, f));
fs.rmSync(path.join(java, 'MainActivity.java'), { force: true });
for (const f of fs.readdirSync(`${OV}/res/raw`)) fs.copyFileSync(`${OV}/res/raw/${f}`, path.join(raw, f));
fs.copyFileSync(`${OV}/AndroidManifest.xml`, path.join(A, 'app/src/main/AndroidManifest.xml'));
const edit = (file, fn, marker) => { let s = fs.readFileSync(file, 'utf8'); if (s.includes(marker)) return;
  s = fn(s); if (!s.includes(marker)) throw new Error(`patch failed: ${file}`); fs.writeFileSync(file, s); };
edit(path.join(A, 'build.gradle'), s => s.replace(/(classpath ['"]com\.android\.tools\.build:gradle:[^'"]+['"])/, `$1\n        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.24'`), 'kotlin-gradle-plugin');
edit(path.join(A, 'app/build.gradle'), s => s.replace(/(apply plugin: ['"]com\.android\.application['"])/, `$1\napply plugin: 'kotlin-android'`).replace(/android \{/, `android {\n    kotlinOptions { jvmTarget = '17' }`), 'kotlin-android');
console.log('Android overlay applied.');
