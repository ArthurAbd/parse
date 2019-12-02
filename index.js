const osmosis = require('osmosis');
const knex = require('./connection.js');


const getFirstUrl = (start) => {
    return new Promise((resolve, reject) => {
        osmosis
        .get(start)
        .find('.item-description-title-link:first > @href')
        .set('firstUrl')
        .data((data) => {
            resolve(data)
        })
        .error(console.log)
    })
}

const getAdsContent = (url) => {
    return new Promise((resolve, reject) => {
        osmosis
        .get(url)
        .set({
            'nextUrl':     '.js-item-view-next-button @href',
            'metaData':     '.title-info-metadata-item-redesign',
            'price':           '.js-item-price @content',
            'avitoNumber':     '.item-view-search-info-redesign span',
            'infoViews':     '.title-info-metadata-views',
            'sellerUrl':     '.seller-info-name a:first @href',
            'sellerName':     '.seller-info-name a:first',
            'sellerRegData':     '.seller-info-value[2]',
            'listParams':     ['.item-params-list-item'],
            'listImgUrl':     ['.gallery-extended-img-frame > @data-url'],
            'description':     '.item-description-text',
            'address':     '.item-address__string',
            'mapCoorX':     '.item-map-wrapper @data-map-lon',
            'mapCoorY':     '.item-map-wrapper @data-map-lat',
        })
        .data(function(data) {
            resolve(data)
        })
    })
}

const getAdsPhone = (data) => {
    const adsId = data['avitoNumber'].substr(2)
    const mobVerUrl = `https://m.avito.ru/api/1/items/${adsId}/phone?key=af0deccbgcgidddjgnvljitntccdduijhdinfgjgfjir`;
    
    return new Promise((resolve) => {
        osmosis
            .get(mobVerUrl)
            .set({
                'body': 'body',
            })
            .data(function({body}) {
                const regExp = /[0-9]{11}/
                data['phone'] = body.match(regExp)
                resolve(data)
            })
    })
}

const checkPhoneUrl = (data) => {
    const checkUrl = `https://mirror.bullshit.agency/search_by_phone/${data['phone'][0]}`

    return new Promise((resolve) => {
        osmosis
            .get(checkUrl)
            .set({
                'body': 'body',
            })
            .data(function({body}) {

                const regExp = /(Студия,.+[0-9]+.+|Комната.[0-9]+.+|[1-9]+.+квартира,.[0-9]+.+),.[0-9]+\/[0-9]+.эт\./gmi
                data['phoneUse'] = body.match(regExp) ? body.match(regExp).length : 0
                resolve(data)
            })
            .log(console.log)
            .error(resolve(data))
            .debug(console.log)
    })
}

const getDataNormaliz = (data) => {
    const dataNormaliz = {}

    nextUrl = `https://www.avito.ru${data['nextUrl']}`
    console.log(nextUrl)
    const regExpUrl = /https:.+[._][0-9]+/
    dataNormaliz['url_avito'] = nextUrl.match(regExpUrl)[0]

    const regExpCity = /\.ru\/([a-z-_]+)/
    dataNormaliz['city'] = nextUrl.match(regExpCity)[1]

    const regExpViews = /\d+/
    dataNormaliz['views'] = data['infoViews'].match(regExpViews)[0]
    
    dataNormaliz['price'] = data['price']
    dataNormaliz['address'] = data['address']

    dataNormaliz['type'] = data['listParams'][3].substr(19)
    dataNormaliz['area'] = data['listParams'][4].substr(15)
    dataNormaliz['floor'] = data['listParams'][0].substr(6)
    dataNormaliz['floors'] = data['listParams'][1].substr(15)

    dataNormaliz['photos'] = data['listImgUrl'].join(',')

    dataNormaliz['coord_map_x'] = data['mapCoorX']
    dataNormaliz['coord_map_y'] = data['mapCoorY']

    dataNormaliz['name'] = data['sellerName']
    dataNormaliz['phone_number'] = data['phone'][0]
    dataNormaliz['phone_use'] = data['phoneUse']

    dataNormaliz['description'] = data['description']
    dataNormaliz['avito_number'] = data['avitoNumber'].substr(2)

    return dataNormaliz
}

const start = 'https://www.avito.ru/rossiya/kvartiry/sdam/na_dlitelnyy_srok?cd=1&s=104&user=1';
let nextUrl = null

const startParser = async () => {
    console.log('startParser')
    
    if (!nextUrl) {
        await getFirstUrl(start)
            .then((data) => {
                // console.log('1',data)
                nextUrl = `https://www.avito.ru${data['firstUrl']}`
            })
    }
    console.log(nextUrl)
    return getAdsContent(nextUrl)
}

let i = 0
const parser = () => {
    startParser()  
        .then((data) => {
            // console.log('2',data)
            return getAdsPhone(data)
        })
        .then((data) => {
            // console.log('3',data)
            return checkPhoneUrl(data)
        })
        .then((data) => {
            // console.log('4',data)
            return getDataNormaliz(data)
        })
        .then(async (dataNormaliz) => {
            // console.log('dataNormaliz',dataNormaliz)
            if (await isAdsNumber(dataNormaliz['avito_number'])) { //true false
            } else {
                await sendDataNormaliz(dataNormaliz)
                i < 10 ? parser() : null
                console.log(i)
                i++
            }
        })
}

parser()

const isAdsNumber = () => false
const sendDataNormaliz = async (dataNormaliz) => {
    await knex('rooms').insert(dataNormaliz)
        .then((data) => console.log('id',data))
}


