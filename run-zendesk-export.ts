import { importZendeskToCsv} from "./zendesk-export";
import {config as initEnvVars} from "dotenv";
import {appendFileSync} from "fs";
initEnvVars({ path: `.env`});

const accessToken = process.env.ZEDNESK_USER_TOKEN || '';
const subdomain = process.env.ZEDNESK_SUBDOMIN || '';
const username = process.env.ZEDNESK_USER || '';
if (!accessToken || accessToken === '') {
  throw new Error('missing access token')
}

importZendeskToCsv(username, accessToken, subdomain, 'pilot-data').then(() => {
  console.log("Zendesk export completed")
})
