/**
 * Middleware that sets the default pagination to page = 0 and limit = 25
 *
 * @export
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
export default function setDefaultPaginationIfNotPresent(req, res, next) {
  if (req.query._limit == undefined || req.query._limit > 150) {
    req.query._limit = '25';
  }
  if (req.query._page == undefined) {
    req.query._page = '0';
  }
  next();
}
