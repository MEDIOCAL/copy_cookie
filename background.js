function getItem(key, cb) {
    if(chrome.storage) {
        chrome.storage.sync.get([key], function(result) {
            try {
                if(result) {
                    cb(result[key])
                }
            } catch(err) {
                console.log(err)
            }
        })
    } else if(localStorage) {
        const result = localStorage.getItem(key)
        const value = JSON.parse(result)
        cb(value)
    }
}

let list = [{
    source: 'http://localhost',
    target: '',
    checked: true
}]


chrome.cookies.onChanged.addListener(function(changeInfo) {
    getItem('copy_cookie_list', function(result) {
        if(Array.isArray(result) && result.length > 0) {
            list = result
        }
        const cookie = changeInfo.cookie
        const data = list.find(val => val.checked)
        let isSet = false
        if(data) {
            const target = data.target
            const domain = target.replace(/(https|http):\/\//g, '').split('?')[0].split('/')[0]
            isSet = (domain.replace('.', '') == cookie.domain.replace('.', ''))
        }
        if(isSet) {
            const source = data.source
            const domain = source.replace(/(https|http):\/\//g, '').split('?')[0].split('/')[0]
            let secure = false
            if(source.indexOf('https') === 0) {
                secure = true
            }
            
            if(changeInfo.removed) {
                chrome.cookies.remove({
                    url: source.split('?')[0],
                    name: cookie.name,
                })
            } else {
                setCookies({
                    url: source.split('?')[0],
                    name: cookie.name,
                    value: cookie.value,
                    domain: domain,
                    path: cookie.path,
                    secure: secure,
                    httpOnly: cookie.httpOnly,
                    expirationDate: cookie.expirationDate
                })
            }
        }
    })
 
})

function setCookies(cookie) {
    chrome.cookies.set(cookie)
    message()
}

function message() {
    if(chrome.notifications) {
        chrome.notifications.create(Math.random()+'', {
            type: 'list',
            iconUrl: 'icon.png',
            title: 'message',
            contextMessage: 'cookie 发生变化，已重新复制',
            eventTime: Date.now() + 1000
        })
    }
}