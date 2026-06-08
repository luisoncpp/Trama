# Electron Builder: signAndEditExecutable Controls Icon Replacement

When packaging for Windows using `electron-builder`, setting `"signAndEditExecutable": false` under the `"win"` configuration bypasses the `rcedit` tool. This not only skips code signing but also prevents `electron-builder` from replacing the default Electron executable icon with your custom `build/icon.ico`. 

If your distributable `.exe` continues to show the default Electron icon despite having a correct `build/icon.ico`, ensure `"signAndEditExecutable": true` (which is the default).
