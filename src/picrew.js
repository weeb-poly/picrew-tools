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
const relKey = '';

const cacheFiles = false;

async function getRelKey(imgMakerId) {
    if (relKey !== '') return relKey;
    const response = await got(`https://picrew.me/image_maker/${imgMakerId}`);
    const $ = cheerio.load(response.body);
    return $("#image-maker > image-maker-component").attr("release-key");
}

async function getPicrewDataFile(filePath, url = '') {
    // Used to load picrew data files as well as optional
    // caching to avoid scraping detection (these files don't
    // change unless the picrew gets updated)
    try {
        return await fs.promises.readFile(filePath).then(resp => JSON.parse(resp));
    } catch (_err) {
        if (url === '') {
            return Promise.reject(_err);
        }
        const res = await got(url).json();
        if (cacheFiles) {
            await fs.promises.writeFile(filePath, JSON.stringify(res));
        }
        return res;
    }
}

async function getImgConf(imgMakerId, relKey) {
    // Important to match config with cdn urls
    return await getPicrewDataFile(
        `./data/picrew.img.data.${imgMakerId}.json`,
        `https://cdn.picrew.me/app/image_maker/${imgMakerId}/${relKey}/img.json`
    );
}

async function gettCfConf(imgMakerId, relKey) {
    // cpList is for the color pallete (not useful for this use case)
    // lyrList might be useful (contains layer order, but needs key for imgconf)
    return await getPicrewDataFile(
        `./data/picrew.cf.data.${imgMakerId}.json`,
        `https://cdn.picrew.me/app/image_maker/${imgMakerId}/${relKey}/cf.json`
    );
}

async function getLocalData(imgMakerId) {
    // Json file is from localstorage
    // Use console.save (http://bgrins.github.io/devtools-snippets/#console-save)
    /**
     * console.save(
     *   localStorage.getItem(`picrew.local.data.${imgMakerId}`),
     *   `picrew.local.data.${imgMakerId}.json`
     * )
     */
    return await getPicrewDataFile(
        `./data/picrew.local.data.${imgMakerId}.json`,
        ''
    );
}

async function downloadFile(fullUrl) {
    const fname = './imgs/' + path.basename(fullUrl);
    await pipeline(
        got.stream(fullUrl),
        fs.createWriteStream(fname)
    );
}

async function dlPicrewItems(local_data, imgMakerId) {
    const relKey = await getRelKey(imgMakerId);
    const { baseUrl, lst } = await getImgConf(imgMakerId, relKey);

    for (const { itmId, cId } of Object.values(local_data)) {
        if (itmId === 0) continue;
        const url = Object.values(lst[itmId])[0][cId]['url'];
        const fullUrl = baseUrl + url;
        await downloadFile(fullUrl);
    }
}

async function dlAllPicrewItems(imgMakerId) {
    const relKey = await getRelKey(imgMakerId);
    const { baseUrl, lst } = await getImgConf(imgMakerId, relKey);

    for (const l1 of Object.values(lst)) {
        for (const l2 of Object.values(l1)) {
            for (const l3 of Object.values(l2)) {
                const url = l3['url'];
                const fullUrl = baseUrl + url;
                await downloadFile(fullUrl);
            }
        }
    }
}

async function addPicrewMeta(local_data) {
    // untested and shouldn't be relied upon
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
