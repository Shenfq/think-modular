let global = {}

import('./module-a').then(
  a => {
    global.a = a.default
    return import('./module-b')
  }
).then(
  b => {
    global.b = b.default
    let person = Object.assign({}, global.a, global.b)
    person.changeAge(18)
    person.showName()
    console.log(person)
  }
)