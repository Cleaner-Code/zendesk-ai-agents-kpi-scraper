import { chromium } from "playwright";
import { question } from "readline-sync";
import fs from "fs";

const selector = '[data-tour-id="conversation__conversation-counter"]';

async function savePage(page, filename) {
    const pageHTML = await page.content();
    fs.writeFileSync(`html_pages/${filename}`, pageHTML);
}

async function screenshotPage(page, filename) {
    await page.screenshot({ path: `screenshots/${filename}.png` });
}

function getSupportURL(subdomain) {
    return `https://${subdomain}.zendesk.com/agent`;
}

function getGotoAIAgentsURL(subdomain) {
    return `https://${subdomain}.zendesk.com/admin/channels/ai-agents-automation/ai-agents?ref=product_tray`;
}

async function loadSession(config, page) {
    // Load cookies if they exist
    const filename = `./cache/cookies_${config.id}.json`;
    if (fs.existsSync(filename)) {
        const cookiesString = fs.readFileSync(filename, "utf-8");
        const cookies = JSON.parse(cookiesString);
        await page.context().addCookies(cookies);
        console.log(`Loaded cookies from '${filename}'`);
    }
}

async function saveSession(config, page) {
    const filename = `./cache/cookies_${config.id}.json`;
    const cookies = await page.context().cookies();
    fs.writeFileSync(filename, JSON.stringify(cookies, null, 2));
    console.log(`Saved cookies to '${filename}'`);
}

async function waitForRedirectsAndLoad(page, extraWaitTime = 0) {
    await page.waitForTimeout(500);
    await page.waitForLoadState("load");
    await page.waitForTimeout(500 + extraWaitTime);
}

async function isLoggedIn(page, config) {
    await page.goto(getSupportURL(config["subdomain"]));
    await waitForRedirectsAndLoad(page);
    return await isLoginPage(page, config);
}

async function isLoginPage(page, config) {
    return await page.url().startsWith(getSupportURL(config["subdomain"]));
}

async function login(config, page) {
    const email = process.env[config["username_env_variable_name"]];
    const password = process.env[config["password_env_variable_name"]];

    console.log(`Logging in with email: ${email}`);

    await screenshotPage(page, "login");

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('[type="submit"]');

    await waitForRedirectsAndLoad(page);
    await screenshotPage(page, "after_credentials");
    await savePage(page, "after_credentials.html");

    const twoFactorCode = question("2FA Code: ");
    await page.fill("input", twoFactorCode);
    await page.getByRole("button", { name: "Verify" }).click();

    await waitForRedirectsAndLoad(page);
    await screenshotPage(page, "after_2fa");

    await page.goto(getGotoAIAgentsURL(config["subdomain"]));
    await waitForRedirectsAndLoad(page, 2000);

    await screenshotPage(page, "after_login");
    await savePage(page, "after_login.html");
}

export async function createBrowserSession(config) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await loadSession(config, page);
    if (await isLoggedIn(page, config)) {
        console.log("Already logged in via cookies.");
    } else {
        console.log("Not logged in, proceeding with login.");
        await login(config, page);
        await saveSession(config, page);
    }

    return { browser, page };
}

export async function scrapeCountFromURL(page, url, config) {
    await page.goto(url);
    await waitForRedirectsAndLoad(page);

    await screenshotPage(page, "redirect_destination");

    if (await isLoginPage(page, config)) {
        console.log("We were logged out again. Cancelling.");
        return null;
    }

    try {
        await page.waitForSelector(selector, { timeout: 8000 });
    } catch (error) {
        console.log(`Failed to find counter on page: '${url}'`);
        await screenshotPage(page, "error");
        await savePage(page, "error.html");
        throw error;
    }
    const counterEl = page.locator(selector);
    const count = await counterEl.textContent();
    return count;
}

export async function closeBrowserSession(browser) {
    await browser.close();
}
