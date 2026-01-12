This script automates writing the conversation counts of Ultimate AI into a
Google Spreadsheet file.

**To run it:**

1. Install Yarn and Node.js
2. Install Yarn dependencies with `yarn install`
3. Acquire the `.env` file
4. Acquire the `credentials.json` file
5. Run the script with `node ./index.js <config>` where `config` is the file
   name of the configuration file

**Pre-requisites:**

- The user, whose credentials are in the `.env` file, has access to Ultimate AI
- The Spreadsheet file is shared with the service account.
- The Spreadsheet file contains dates in column A
- The Spreadsheet file contains the URL with empty query parameters in row 1
  (may be hidden)

**Caching:**

The script caches:

- The cookies/browser session after a successful login per configuration name
- The conversation counts as JSON

**Configuration file format:**

```json
{
  "id": "<NAME OF THE CONFIGURATION>",
  "username_env_variable_name": "<NAME OF THE ENV VARIABLE FOR THE USERNAME FOR THIS CONFIG>",
  "password_env_variable_name": "<NAME OF THE ENV VARIABLE FOR THE PASSWORD FOR THIS CONFIG>",
  "spreadsheet_id": "<ID OF THE GOOGLE SPREADSHEET>",
  "dates_begin_at_row": "<ROW WHERE THE DATES/DATA BEGINS>"
}
```

**Limitations:**

- Max columns: ZZ (676)
