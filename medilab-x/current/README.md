# MediLab X v10.0.8 Windows source

This is the isolated MediLab X Standard release channel. It does not change legacy ADC Software updates. Full uncompressed source and scripts are inside the downloadable ZIP supplied in ChatGPT. On GitHub, index.html is split into gzip+base64 parts due to connector upload size; the Windows release workflow verifies SHA-256 and reconstructs it.

**Update security**: Only the GitHub Actions Windows job can publish `medilab-x/update.json` after a successful installer build and SHA-256 calculation. A source commit alone is not an installable release. New versions require user approval in the app. Back up production data before upgrading. Unsigned installer builds may produce Windows SmartScreen warnings and should be signed before broad distribution.