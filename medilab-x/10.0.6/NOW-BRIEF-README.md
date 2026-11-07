# MediLab X 10.0.6 — Now Brief Only

This package preserves existing app storage keys, patient modules and Windows installer scripts. The old AI Assistant UI is hidden/removed, and the new Now Brief reads each major MediLab module locally. It does NOT upload raw patient/employee information, names, medical report text, or phone numbers.

**Offline operation:** read-only rotating statements based on registered records. These are verified calculations, not generated medical advice.

**Optional cloud Gemini:** In Settings → Now Brief enable the cloud wording toggle. A brief numeric aggregate and one verified sentence can be sent to Gemini *once per hour at most*. If the key is missing or the API fails, Now Brief remains fully operational offline. The model cannot change patient records.

**Build:** open the included BUILD-WINDOWS.bat on Windows with Node.js/npm. Ensure the generated EXE is verified and digitally signed before publishing a live update.

**GitHub:** Do not replace the existing ADC 8.x update.json with this source-only package. This repository requires a genuine, tested EXE release asset and SHA-256 checksum before activating a new update channel.

**Security:** Windows environment variable GEMINI_API_KEY remains outside renderer HTML. Before commercial deployment, review data permissions, encryption-at-rest, user roles and audit controls.