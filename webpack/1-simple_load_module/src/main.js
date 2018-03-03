import nameObj from './module-a.js'
import ageObj from './module-b.js'


const people = Object.assign({}, nameObj, ageObj)

console.log(people)