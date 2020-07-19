const stream = require('stream');
const fs = require('fs');
const util = require('util');
const url = require('url');
const path = require('path');

const got = require('got');
const cheerio = require('cheerio');
const pngitxt = require('png-itxt');

const pipeline = util.promisify(stream.pipeline);

// https://picrew.me/image_maker/{imgMakerId}
const imgMakerId = '17250';

async function getRelKey(imgMakerId) {
    // $("#image-maker > play-view-container-component").attr("release-key")
    const response = await got(`https://picrew.me/image_maker/${imgMakerId}`);
    const $ = cheerio.load(response.body);
    return $("#image-maker > play-view-container-component").attr("release-key");
}

async function getImgConf(imgMakerId, relKey) {
    // Important to match config with cdn urls
    const resp = await got(`https://cdn.picrew.me/app/image_maker/${imgMakerId}/${relKey}/img.json`).json();
    return resp;
}

async function gettCfConf(imgMakerId, relKey) {
    // cpList is for the color pallete (not useful for this use case)
    // lyrList might be useful (contains layer order, but needs key for imgconf)
    const resp = await got(`https://cdn.picrew.me/app/image_maker/${imgMakerId}/${relKey}/cf.json`).json();
    return resp;
}

async function getLocalData(imgMakerId) {
    // Json file is from localstorage `copy(localStorage.getItem('picrew.local.data.{imgMakerId}'))`
    const resp = await fs.promises.readFile(`picrew.local.data.${imgMakerId}.json`);
    return JSON.parse(resp);
}

async function downloadFile(fullUrl) {
    const parsed = url.parse(fullUrl);
    const fname = path.basename(parsed.pathname);
    await pipeline(
        got.stream(fullUrl),
        fs.createWriteStream(fname)
    );
}

async function dlPicrewItems(local_data, imgMakerId) {
    const relKey = await getRelKey(imgMakerId);
    const { baseUrl, lst } = await getImgConf(imgMakerId, relKey);

    for (const entry of Object.values(local_data)) {
        const { itmId, cId } = entry;
        if (itmId === 0) continue;
        const url = Object.values(lst[itmId])[0][cId]['url'];
        const fullUrl = baseUrl + url;
        await downloadFile(fullUrl);
    }
}

async function addPicrewMeta(local_data) {
    const str_data = JSON.stringify(local_data);
    await pipeline(
        fs.createReadStream('input.png'),
        pngitxt.set({ type: 'zTXt', keyword: 'picrew', value: str_data }, true),
        fs.createWriteStream('output.png')
    );
}

(async () => {
    const local_data = await getLocalData(imgMakerId);
    const res = await dlPicrewItems(local_data, imgMakerId);
    console.log(res);
})();
