import _ from 'lodash'

export default {
  age: 22,
  changeAge (age) {
    if (!_.isInteger(age)) {
      console.error('Age must be an integer')
      return false
    }
    this.age = age;
  }
}