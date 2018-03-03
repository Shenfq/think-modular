import _ from 'lodash'
export default {
  name: "shenfq",
  showName () {
    console.log(_.toUpper(this.name))
  }
};