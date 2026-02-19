/**
 * Expo Config Plugin — copies MapLibre glyph PBF files into the iOS app bundle.
 *
 * Android stores glyphs in android/app/src/main/assets/glyphs/ and MapLibre
 * resolves asset:// from there automatically. On iOS, asset:// resolves from
 * the main NSBundle, so the files must be explicitly added to the Xcode project's
 * Copy Bundle Resources phase.
 *
 * This plugin runs during `expo prebuild` / EAS Build and:
 *   1. Copies glyphs/ into ios/<projectName>/glyphs/
 *   2. Adds the folder as a resource in the Xcode project
 *
 * Source of truth: assets/glyphs/ in the project root (committed to git).
 */

const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn('[withIOSGlyphs] Source directory not found:', src);
    return false;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const srcPath = path.join(src, name);
    const destPath = path.join(dest, name);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  return true;
}

const withIOSGlyphs = (config) => {
  // Step 1a: Copy glyphs into the iOS native project directory
  config = withDangerousMod(config, [
    'ios',
    (config) => {
      const { projectRoot, platformProjectRoot, projectName } = config.modRequest;
      const src = path.join(projectRoot, 'assets', 'glyphs');
      const dest = path.join(platformProjectRoot, projectName, 'glyphs');
      const copied = copyDirSync(src, dest);
      if (copied) {
        console.log('[withIOSGlyphs] Copied glyphs to', dest);
      }
      return config;
    },
  ]);

  // Step 1b: Copy glyphs into the Android assets directory (MapLibre resolves asset:// from there)
  config = withDangerousMod(config, [
    'android',
    (config) => {
      const { projectRoot, platformProjectRoot } = config.modRequest;
      const src = path.join(projectRoot, 'assets', 'glyphs');
      const dest = path.join(platformProjectRoot, 'app', 'src', 'main', 'assets', 'glyphs');
      const copied = copyDirSync(src, dest);
      if (copied) {
        console.log('[withIOSGlyphs] Copied glyphs to', dest);
      }
      return config;
    },
  ]);

  // Step 2: Register the glyphs folder in the Xcode project's Copy Bundle Resources.
  // Uses direct pbx object manipulation instead of addResourceFile() to avoid
  // a crash in the xcode library's internal path-correction logic.
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const { projectName } = config.modRequest;

    // Avoid adding duplicates on repeated prebuild runs
    const fileRefs = xcodeProject.pbxFileReferenceSection();
    const glyphsPath = `${projectName}/glyphs`;
    const alreadyAdded = Object.values(fileRefs).some(
      (ref) => typeof ref === 'object' && ref?.path === glyphsPath,
    );

    if (alreadyAdded) {
      return config;
    }

    // Generate UUIDs
    const fileRefUuid = xcodeProject.generateUuid();
    const buildFileUuid = xcodeProject.generateUuid();

    // Add PBXFileReference using SOURCE_ROOT so the path resolves unambiguously
    // to ios/TOORA/glyphs regardless of which group it's placed in.
    fileRefs[fileRefUuid] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'folder',
      name: 'glyphs',
      path: glyphsPath,
      sourceTree: 'SOURCE_ROOT',
    };
    fileRefs[fileRefUuid + '_comment'] = 'glyphs';

    // Add to whichever top-level group we can find
    const groups = xcodeProject.hash.project.objects['PBXGroup'];
    const groupKey =
      xcodeProject.findPBXGroupKey({ path: projectName }) ||
      xcodeProject.findPBXGroupKey({ name: projectName });
    if (groupKey && groups[groupKey]) {
      groups[groupKey].children.push({ value: fileRefUuid, comment: 'glyphs' });
    }

    // Add PBXBuildFile entry
    const buildFiles = xcodeProject.pbxBuildFileSection();
    buildFiles[buildFileUuid] = {
      isa: 'PBXBuildFile',
      fileRef: fileRefUuid,
      fileRef_comment: 'glyphs',
    };
    buildFiles[buildFileUuid + '_comment'] = 'glyphs in Resources';

    // Add to Copy Bundle Resources build phase
    const target = xcodeProject.getFirstTarget();
    if (target) {
      const resourcesPhase = xcodeProject.pbxResourcesBuildPhaseObj(target.uuid);
      if (resourcesPhase) {
        resourcesPhase.files.push({ value: buildFileUuid, comment: 'glyphs in Resources' });
      }
    }

    console.log('[withIOSGlyphs] Added glyphs folder to Xcode resources');
    return config;
  });

  return config;
};

module.exports = withIOSGlyphs;
