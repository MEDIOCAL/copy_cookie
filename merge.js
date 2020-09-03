const $list = document.querySelector('#list-box')
const $run = document.querySelector('#run')
const $add = document.querySelector('#add')
let last = {}

function message() {
    var time = /(..)(:..)/.exec(new Date())  
    var hour = time[1] % 12 || 12            
    var period = time[1] < 12 ? 'a.m.' : 'p.m.'
    const id = hour + time[2] + ' ' + period
    if(window.Notification) {
        new Notification(id, {
            icon: 'icon.png',
            body: 'success'
        })
    }
}

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

function setItem(key, data) {
    if(!data) {
        return 
    }
    if(chrome.storage) {
        chrome.storage.sync.set({[key]: data})
    } else if(localStorage) {
        const value = JSON.stringify(data)
        localStorage.setItem(key, value)
    }
}


let list = [{
    source: 'http://localhost',
    target: '',
    checked: true
}]

getItem('copy_cookie_list', function(result) {
    if(Array.isArray(result) && result.length > 0) {
        list = result
    }
    renderList()
})

getItem('copy_cookie_last', function(result) {
    if(typeof result === 'object') {
        last = result
    }
})

function setList(list) {
    setItem('copy_cookie_list', list)
}

function setCookies(cookie) {
    setTimeout(() => {
        chrome.cookies.set(cookie)      
    }, 0)
}

$run.addEventListener('click', function() {
    const data = list.find(val => val.checked)
    const {target, source} = data 
    if(target && source) {
        let domain = source.replace(/(https|http):\/\//g, '').split('?')[0].split('/')[0]
        let secure = false
        if(source.indexOf('https') === 0) {
            secure = true
        }

        if(target.indexOf('https:') >= 0 || target.indexOf('http:') >= 0) {
            chrome.cookies.getAll({url: target}, function (cookies) {
                updateCookies(cookies);
            });
        } else {
            const cookieList = target.split(';');
            const cookies = cookieList.map(val => { 
                const key = val.split('=')[0];
                const v = val.split('=')[1];
                return {
                    name: key.trim(),
                    value: v.trim(),
                    path: '/',
                    httpOnly: false,
                    expirationDate: Date.now() + 360000
                } 
            });
            updateCookies(cookies);
        }

        function updateCookies(cookies) {
            // 如果赋值的地址发生改变，但是目标没有改变，则需要把目标中的 cookie 清除
            if(last.target && last.target != target && last.source == source) {
                for(let name of last.cookies) {
                    chrome.cookies.remove({
                        url: source.split('?')[0],
                        name: name
                    })
                }
            } 
            // 取自相同的域名，则去掉无用的
            if(last.target && last.target === target) {
                for(let name of last.cookies) {
                    const c = cookies.find(function(val) {
                        return val.name == name 
                    })
                    // 该 name 不存在新的 cookies 里
                    if(!c) {
                        chrome.cookies.remove({
                            url: source.split('?')[0],
                            name: name
                        })
                    }
                }
            }
        
            last.cookies = []
        
            for(let cookie of cookies) {
                last.cookies.push(cookie.name)
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
            last.target = target
            last.source = source
            setItem('copy_cookie_last', last)
            message()
        }
    } 
})

$add.addEventListener('click', function() {
    list.push({
        source: '',
        target: '', 
        checked: false
    })
    renderList()
    setList(list)
})

function renderList() {
    $list.innerHTML = ''
    for(let val of list) {
        const source = val.source
        const target = val.target
        const w = document.createElement('div')
        const txt = document.createTextNode('TO ')
        const radio = document.createElement('input')
        const s = document.createElement('input')
        const t = document.createElement('input')
        const d = document.createElement('span')
        w.setAttribute('class', 'item')
        d.setAttribute('class', 'del')
        s.setAttribute('class', 'sourcedata')
        t.setAttribute('class', 'targetdata')
        t.setAttribute('placeholder', 'copy url')
        radio.setAttribute('type', 'radio')
        radio.setAttribute('name', 'set')
        if(val.checked) {
            radio.setAttribute('checked', true)
        }
        if(source) {
            s.value = source
        }

        if(target) {
            t.value = target
        }

        d.innerHTML = '删除'
        s.addEventListener('change', function(e) {
            const value = e.target.value 
            const index = findNodeIndex(e.target.parentNode)
            list[index].source = value
            setList(list)
        })
        t.addEventListener('change', function(e) {
            const value = e.target.value 
            const index = findNodeIndex(e.target.parentNode)
            list[index].target = value
            setList(list)
        })
        d.addEventListener('click', delItem)
        radio.addEventListener('change', change)

        w.appendChild(radio)
        w.appendChild(t)
        w.appendChild(txt)
        w.appendChild(s)
        w.appendChild(d)
        $list.appendChild(w)
    }
}

function delItem(e) {
    const index = findNodeIndex(e.target.parentNode)
    if(index >= 0) {
        list.splice(index, 1)
        setList(list)
        renderList()
    }
}

function change(e) {
    const checked = e.target.checked 
    const index = findNodeIndex(e.target.parentNode)
    list.forEach(val => {
        val.checked = false
    })
    list[index].checked = checked
    setList(list)
}

function findNodeIndex(node) {
    const index = Array.prototype.findIndex.call(document.querySelectorAll('.item'), function(el) {
        return node === el
    })
    return index
}
