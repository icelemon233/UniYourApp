# Edition maintenance

This directory is the complete English skill package. The repository root contains `中文版`, `English_Version`, and one bilingual `README.md`. Install the package under the name `uni-your-app`.

- Maintain the six engineering, shared UI, Web, Windows, verification, and README references with equivalent behavior and authority across languages.
- Each edition contains its complete configuration tools. After editing common tools in this edition, run `node scripts/sync-versions.mjs` to synchronize the other edition. Maintain translated guidance and interface metadata separately.
- Public contents comprise general guidance, the configuration protocol, editor, and necessary maintenance tools. Keep personal preferences, private brand assets, research, and run records in user directories or excluded working directories.
- Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining.
- Run `node scripts/validate.mjs` and `node --test scripts/config.test.mjs scripts/validate.test.mjs` from this directory. A complete checkout validates both editions, while an independent installation validates its own package.
- Tests use this directory's `work/` and an isolated `--user-dir`. Interface changes receive real input, draft, inheritance, save, and relevant viewport checks.
- `.github/workflows/validate.yml` provides automatic checks when this edition is used as a standalone repository. Use the edition commands above for the bilingual repository.
- Pair each Chinese paragraph with its English counterpart in the single repository README. Explain tool-independent Agent installation and use for first-time readers. The hero is stored at `assets/readme-hero.png` and synchronized with common resources. Check links, installed names, configuration paths, and actual GitHub rendering.
