var ISTANBUL = require('istanbul'),

    Report = ISTANBUL.Report,
    Collector = ISTANBUL.Collector;

/**
 * Expose `Istanbul`.
 */
exports = module.exports = Istanbul;

/**
 * Initialize a new Istanbul reporter.
 *
 * @param {Runner} runner
 * @public
 */
function Istanbul(runner) {

    runner.on('end', function(){

        var reporters;
        if (process.env.ISTANBUL_REPORTERS) {
            reporters = process.env.ISTANBUL_REPORTERS.split(',');
        } else {
            reporters = ['text-summary', 'html'];
        }

        var cov = global.__coverage__ || {},
            collector = new Collector();

        collector.add(cov);

        reporters.forEach(function(reporter) {
            Report.create(reporter).writeReport(collector, true);
        });

    });

}
