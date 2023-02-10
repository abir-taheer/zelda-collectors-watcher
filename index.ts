import { config } from "dotenv";
import axios from "axios";
import { parse } from "node-html-parser";
import { createTransport } from "nodemailer";

config();

if (
  !process.env.SMTP_HOST ||
  !process.env.SMTP_USERNAME ||
  !process.env.SMTP_PASS
) {
  throw new Error("You gotta give me smtp credentials bud");
}

const getMailer = () => {
  return createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASS,
    },
  });
};

const url = `https://www.gamestop.com/video-games/nintendo-switch/products/legend-of-zelda-tears-of-the-kingdom---nintendo-switch/20001188.html?dwvar_20001188_condition=New&dwvar_20001188_edition=Collector%27s`;

const sendNotif = async (email: string) => {
  const mailer = await getMailer();

  await mailer.sendMail({
    from: "abir@taheer.me",
    to: email,
    subject:
      "Back in Stock: Legend of Zelda: Tears of the Kingdom Collector's Edition - Nintendo Switch",
    html: `<p>
        As per your request, there's been a change to the gamestop website which
        likely means that the game is now back in stock.
      </p>
      <p>For convenience, a link to the url is below:</p>
      <p><a href="${url}">Legend of Zelda: Tears of the Kingdom Collector's Edition - Nintendo Switch</a></p>`,
  });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const getRandom = (min: number, max: number) =>
  Math.floor(Math.random() * max) + min;

const getSite = async () => {
  const { data } = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Safari/605.1.15",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Host: "www.gamestop.com",
    },
  });

  return data;
};

const regex = /<script type=".+">.+<\/script>/gim;

type Offer = {
  "@type": string;
  name: string;
  sku: string;
  price: "129.99";
  priceCurrency: "USD";
  seller: "GameStop";
  category: "Nintendo Switch";
  availability: "https://schema.org/OutOfStock";
  itemCondition: "https://schema.org/NewCondition";
};

const getStatus = async () => {
  const html: string = await getSite();
  const matches = html.match(regex);

  if (!matches?.length) {
    return null;
  }

  try {
    const script = parse(matches[0]);
    const data = JSON.parse(script.innerText);

    const offer: Offer = data.offers.find((a: any) => a.sku === "390784");
    return offer;
  } catch (e) {
    return null;
  }
};

const oneSecond = 1000;
const oneMinute = oneSecond * 60;

const minWaitTime = oneSecond * 30;
const maxWaitTime = oneMinute * 2;

const check = async () => {
  while (true) {
    const offer = await getStatus();

    // We couldn't load for some reason, notify user
    if (offer === null) {
      break;
    }

    // We could load, and it's not out of stock, notify user
    if (offer.availability !== "https://schema.org/OutOfStock") {
      break;
    }

    const timeToSleep = getRandom(minWaitTime, maxWaitTime);
    await sleep(timeToSleep);
  }

  // send an email
  await sendNotif("email@gmail.com");
};

check();
