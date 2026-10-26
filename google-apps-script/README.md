# Google Apps Script deployment

The project has no live Google account, spreadsheet ID, CSV Drive file ID, credentials, or deployment URL configured. These steps require manual setup.

## 1. Prepare Google Drive and Sheets

1. Sign in to the Google account that should own the quiz integration.
2. Create or select the results Google Sheet.
3. Create a worksheet named `Results`, or choose another name for the Script Property.
4. Upload the private CSV file to Google Drive. Do not make the CSV public.
5. Copy the spreadsheet ID and CSV file ID from their URLs.

## 2. Create the Apps Script project

1. Open [script.google.com](https://script.google.com/) with the selected account.
2. Create a standalone Apps Script project.
3. Copy `Code.gs` into the script editor.
4. Copy the contents of `appsscript.json` into **Project Settings > Show "appsscript.json" manifest file**.
5. In **Project Settings > Script Properties**, add:

   - `SPREADSHEET_ID`: target spreadsheet ID
   - `CSV_FILE_ID`: private CSV Drive file ID
   - `RESULTS_SHEET_NAME`: `Results` (or the chosen worksheet name)

The script reads these values at runtime; no ID is hardcoded in the source.

## 3. Authorize and deploy

1. Run `doGet` once from the Apps Script editor.
2. Review and accept permissions for Drive, Sheets, and external requests if prompted.
3. Select **Deploy > New deployment**.
4. Select **Web app**.
5. Set **Execute as** to `Me`.
6. Set **Who has access** to the intended student audience. `Anyone` permits unauthenticated submissions and is only appropriate when the deployment is protected by other controls; it does not authenticate Student IDs.
7. Deploy and copy the Web app URL.

Do not claim that a Student ID verifies identity. The endpoint validates format and records the supplied ID only.

## 4. Configure the frontend

Edit `public/config.js` and set `submissionEndpoint` to the deployed Web app URL. Do not put credentials or spreadsheet IDs in this file.

The frontend submits through a hidden form to an iframe and waits for a `postMessage` response. This is intentional: Apps Script web-app responses commonly redirect and do not reliably provide readable CORS JSON to a static page. The response includes a random request token, which the frontend checks before accepting it.

Test the actual deployed URL from the same origin where students will use the app. A local `file:` URL is not a valid production test.

## Results worksheet format

The script creates these headers on an empty worksheet:

`Timestamp | Student ID | Attempt ID | Correct Answers | Maximum Score | Percentage | Answers JSON`

`Answers JSON` contains one object per question, in CSV order. An unanswered question is stored as `"answer":null`; an invalid request is rejected and creates no row.

The script uses a lock and checks `Attempt ID` before appending. A retry of the same attempt returns the existing result instead of adding a second row.
