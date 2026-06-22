# Changelog

## 0.1.0 (2026-06-22)


### Features

* add Docker publish workflow (main-only latest tag, PR preview without latest) ([dec6c1e](https://github.com/ai-workflow-space/stock-market-toolkit/commit/dec6c1ed241450cfa4eeca0fa82e772502508869))
* add GitHub Actions CI, release-please, and Discord release notification ([b9f2b35](https://github.com/ai-workflow-space/stock-market-toolkit/commit/b9f2b359f9a35d73d403ebee5fdd2fcb5482aa37))
* add OpenCode code review GitHub Action workflow ([e9280b4](https://github.com/ai-workflow-space/stock-market-toolkit/commit/e9280b4744d77767fd5e41a3faa57c2b48b4414b))
* add price alert system with Discord webhook + in-app pull ([13788f8](https://github.com/ai-workflow-space/stock-market-toolkit/commit/13788f8bffa627d926d9bb8ba4aa05a680b5fa56))
* dropdown min 3 chars + add ticker one-by-one ([53130bf](https://github.com/ai-workflow-space/stock-market-toolkit/commit/53130bf526c32560c69e3a7081816d3fd106fd14))


### Bug Fixes

* add .tabs and .tab-btn CSS for aligned Alert page tabs ([7a4b092](https://github.com/ai-workflow-space/stock-market-toolkit/commit/7a4b092f622f5c803c86cd7f870fcdfd9dc2ebc7))
* add AlertsPage CSS styling for dropdowns, modals, and cards ([75b8f2f](https://github.com/ai-workflow-space/stock-market-toolkit/commit/75b8f2f8b3d8bc03e2389ff55d840ebd806d2dd3))
* add asyncpg for PostgreSQL in Docker ([9ef21fd](https://github.com/ai-workflow-space/stock-market-toolkit/commit/9ef21fd4f25e13b40ba0fce9a6ddd087edb27d32))
* add key prop to Recharts Line elements to force re-render on indicator toggle ([9bed8b8](https://github.com/ai-workflow-space/stock-market-toolkit/commit/9bed8b8c6554c0084cc8ff08052b981f33877802))
* add keys to MACD and RSI chart elements for indicator toggle ([9318de7](https://github.com/ai-workflow-space/stock-market-toolkit/commit/9318de714163be7ff1ef1896f247e3e21efee798))
* add retry logic to yfinance search for better Taiwan/intl stock coverage ([6f4d04d](https://github.com/ai-workflow-space/stock-market-toolkit/commit/6f4d04dc81de9d148e5a6652cfbc24ed4e84e6f8))
* broken imports after useAuth hook split + dropdown 3-char gate ([9e54356](https://github.com/ai-workflow-space/stock-market-toolkit/commit/9e54356a4c4c07cb9965b8af8203ef9f5ccf50c1))
* build Docker images for both amd64 and arm64 (M1/M2 Mac support) ([31b39c3](https://github.com/ai-workflow-space/stock-market-toolkit/commit/31b39c3db7526bb06324a607277c15283bfdcb32))
* change frontend port 3030 → 3800 ([#11](https://github.com/ai-workflow-space/stock-market-toolkit/issues/11)) ([30bc840](https://github.com/ai-workflow-space/stock-market-toolkit/commit/30bc8407c28734fc49cfd04b76c73ed91d38c4f8))
* code-review - write output to file instead of GITHUB_OUTPUT to avoid special char issues ([dcc1487](https://github.com/ai-workflow-space/stock-market-toolkit/commit/dcc14875b9595c20408f578079e733d2465cb055))
* code-review workflow env passing for changed files ([a8a114c](https://github.com/ai-workflow-space/stock-market-toolkit/commit/a8a114c828a80a8c3623fc82fa402b4510d0cf0f))
* ComparePage UX — Enter adds tickers, (n/5) counter, Add button ([c4ed024](https://github.com/ai-workflow-space/stock-market-toolkit/commit/c4ed0243f36a9bd0762d18c82be2e36a3046e2a1))
* compute MACD and BollingerBands DataFrames directly ([#9](https://github.com/ai-workflow-space/stock-market-toolkit/issues/9)) ([b755724](https://github.com/ai-workflow-space/stock-market-toolkit/commit/b755724fef51533583a5e21d10187cb4a044044d))
* ESLint errors (set-state-in-effect, explicit-any, hook split) + Discord webhook JSON escaping ([fadd0c4](https://github.com/ai-workflow-space/stock-market-toolkit/commit/fadd0c473e0b4557ee83eb56578baf528042abbc))
* handle short-period intraday data gracefully ([95c83f3](https://github.com/ai-workflow-space/stock-market-toolkit/commit/95c83f378657e0897f4a8dfc19f143e40e2e616e))
* only render RSI/MACD chart panes when indicators are active ([6cea117](https://github.com/ai-workflow-space/stock-market-toolkit/commit/6cea11720b9af687073eb8470d967d26ec936381))
* only show chart lines for active indicators, pass active Set to chart components ([9be6a83](https://github.com/ai-workflow-space/stock-market-toolkit/commit/9be6a8356d300b5112179d00c39c886ae10ff42b))
* prevent dropdown flicker with race condition guard ([4c3d736](https://github.com/ai-workflow-space/stock-market-toolkit/commit/4c3d736a45cfc46631973be95252cb89ede6a607))
* push Docker images on PR builds too ([bc5177a](https://github.com/ai-workflow-space/stock-market-toolkit/commit/bc5177adb23e92e47685d483ad3b506e1aa5ba58))
* remove auth from search_symbols in stocks.py - search is public ([5af4280](https://github.com/ai-workflow-space/stock-market-toolkit/commit/5af4280b26fc57ace99142759948da6261f57e50))
* remove auth headers from searchSymbols() - /api/search is public ([8f7b6fd](https://github.com/ai-workflow-space/stock-market-toolkit/commit/8f7b6fd0207befa748b16d982805fd162fdd1861))
* remove branch-name docker tag (feat/ prefix causes invalid tag) ([bec71ca](https://github.com/ai-workflow-space/stock-market-toolkit/commit/bec71ca7de6a72ff0f10e8fb305e07f5a706514b))
* remove duplicate /api prefix location block in nginx.conf ([0b92461](https://github.com/ai-workflow-space/stock-market-toolkit/commit/0b924619d312e329d28d06b218e51ba77f86d448))
* remove emoji from nav/search, add version footer, inject git SHA via Docker build args, remove docker-compose version field ([ee3892d](https://github.com/ai-workflow-space/stock-market-toolkit/commit/ee3892dd140f7b652ce0a7decd568e25d7697d8c))
* remove unused imports from stocks.py (AsyncSession, select, get_db, pandas, time, json) ([36abd5f](https://github.com/ai-workflow-space/stock-market-toolkit/commit/36abd5f8362b5084d722934d5cb33959aaad661a))
* remove unused imports in main.py (pandas, timedelta, Optional) ([6b36662](https://github.com/ai-workflow-space/stock-market-toolkit/commit/6b36662e26d1f826adf6e3ef7754be9122e627de))
* remove unused imports in models.py (Float, Text, relationship) and auth.py (status) ([15acb69](https://github.com/ai-workflow-space/stock-market-toolkit/commit/15acb69e263bcf1e16b8f5982deb255159321685))
* replace asyncpg with aiosqlite for SQLite local dev ([ec15e06](https://github.com/ai-workflow-space/stock-market-toolkit/commit/ec15e06f4c4e8b5c323cbb925c19ee7d4b1112d9))
* replace non-standard cache_control_max_age with standard nginx expires directive ([6f3ac17](https://github.com/ai-workflow-space/stock-market-toolkit/commit/6f3ac17865fc489c08d87a059815532a30af9a6c))
* resolve 9 ESLint errors (set-state-in-effect, no-explicit-any, hook-separation) ([cc1bb0c](https://github.com/ai-workflow-space/stock-market-toolkit/commit/cc1bb0c32a78604b57ae73d68f83a7dc46872822))
* restore docker-publish.yml, comment out broken pytest step, fix code-review opencode install + permissions ([5f26f94](https://github.com/ai-workflow-space/stock-market-toolkit/commit/5f26f94a3ac4c5eddd4e44e6d6c49fa9ab57b8e0))
* restore relationship/Float/Text imports in models.py, fix all 18 ruff/eslint errors from merged PRs ([737d645](https://github.com/ai-workflow-space/stock-market-toolkit/commit/737d6452df9bdb76486026fab7245b327622476b))
* restore yfinance search API (backend + frontend response parsing) ([fee3056](https://github.com/ai-workflow-space/stock-market-toolkit/commit/fee30567036ae06bd2ead2077915c3728bc4dafc))
* set VITE_API_URL= (empty) to prevent double /api prefix in frontend requests ([d24ed04](https://github.com/ai-workflow-space/stock-market-toolkit/commit/d24ed040f291698d188b372ebb3c519232d8253f))
* set VITE_API_URL=/api in Dockerfile, remove stale frontend/.env from Docker build ([361c655](https://github.com/ai-workflow-space/stock-market-toolkit/commit/361c655564b6fa8d2e3a429ef1d79204fdf40ea7))
* simplify Discord webhook payload (use GitHub context vars directly) ([cac9f76](https://github.com/ai-workflow-space/stock-market-toolkit/commit/cac9f76234b38d29364b21468a83e1a77459e8dc))
* unify AlertsPage empty-state button to match header '+ New Alert' button ([f55df69](https://github.com/ai-workflow-space/stock-market-toolkit/commit/f55df690b8ee344f92445df171d0957000159d59))
* use conditional render for indicator lines instead of hide prop ([f95e03d](https://github.com/ai-workflow-space/stock-market-toolkit/commit/f95e03d16592412c2c5efe76938f84de23f49f51))
* use conditional render for indicator lines, fix VITE_API_URL, remove duplicate nginx location block ([164568e](https://github.com/ai-workflow-space/stock-market-toolkit/commit/164568e73f775e790bfced7400df02703c861cb7))
* use official release-please GitHub Action instead of pip install ([586e24f](https://github.com/ai-workflow-space/stock-market-toolkit/commit/586e24ff20e673b940c439e6d9391473cf8fdfeb))
* use relative API URLs to route through nginx proxy instead of localhost:8001 ([9bf8ee7](https://github.com/ai-workflow-space/stock-market-toolkit/commit/9bf8ee7df09dca248e712b15a8aab7f2f9a52397))


### Documentation

* Add comprehensive documentation covering architecture, external services, community tools, setup, and API reference ([bf579fb](https://github.com/ai-workflow-space/stock-market-toolkit/commit/bf579fb8705a9922e831888fdef208b759498c92))
