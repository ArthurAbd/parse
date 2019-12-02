const osmosis = require('osmosis');

const getFirstUrl = (start) => {
    return new Promise((resolve, reject) => {
        osmosis
        .get(start)
        .find('.item-description-title-link:first > @href')
        .set('firstUrl')
        .data((data) => {
            console.log(data)
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
            'infoNumber':     '.item-view-search-info-redesign span',
            'infoViews':     '.title-info-metadata-views',
            'sellerUrl':     '.seller-info-name a:first @href',
            'sellerName':     '.seller-info-name a:first',
            'sellerRegData':     '.seller-info-value[2]',
            'listParams':     ['.item-params-list-item'],
            'listImgUrl':     ['.gallery-extended-img-frame > @data-url'],
            'description':     '.item-description-text',
            'address':     '.item-address__string',
            'mapCoorX':     '.item-map-wrapper @data-map-lat',
            'mapCoorY':     '.item-map-wrapper @data-map-lon',
        })
        .data(function(data) {
            resolve(data)
        })
    })
}

const getAdsPhone = (data) => {
    const adsId = data['infoNumber'].substr(2)
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
    const checkUrl = `https://mirror.bullshit.agency/search_by_phone/${data['phone']}`

    return new Promise((resolve) => {
        osmosis
            .get(checkUrl)
            .set({
                'body': 'body',
            })
            .data(function({body}) {
                const regExp = /(Студия,.+[0-9]+.+|Комната.[0-9]+.+|[1-9]+.+квартира,.[0-9]+.+),.[0-9]+\/[0-9]+.эт\./gmi
                data['phoneUse'] = body.match(regExp)
                resolve(data)
            })
    })
}

const start = 'https://www.avito.ru/rossiya/kvartiry/sdam/na_dlitelnyy_srok?cd=1&s=104&user=1';
let nextUrl = null


const startParser = () => {
    if (!nextUrl) {
        getFirstUrl(start)
        .then((data) => {
            console.log('1',data)
            return getAdsContent(`https://www.avito.ru${data.firstUrl}`)
        })
    }
    return getAdsContent(`https://www.avito.ru${nextUrl}`)
}

startParser()
    .then((data) => {
        console.log('2',data)
        return getAdsPhone(data)
    })
    .then((data) => {
        console.log('3',data)
        return checkPhoneUrl(data)
    })
    .then((data) => {
        console.log('4',data)
        return getDataNormaliz(data)
    })
    .then((dataNormaliz) => {
        console.log('5',dataNormaliz)
        nextUrl = dataNormaliz['nextUrl']
        
        if (isAdsNumber()) { //true false
            return sendDataNormaliz(dataNormaliz)
        }
        return
    })
