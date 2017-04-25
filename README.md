# wu_tornado_alert

### Description
This is a gem to collect data about your location alert when tornados are in your county.

### Usage ###
1. Create a config.yml file
1. Look at the example_config.yml file on an idea on how to set this up.
1. Install the gem `gem install wu_tornado_alert`
1. You need to use the `-c` option to configure this gem

#### To build, install and run each time:

`gem build wu_data.gemspec; gem install ./wu_data-0.0.0.gem; wu_data -c config.yml`

### Resources ###
[Wunderground API](https://www.wunderground.com/weather/api/d/docs?d=data/alerts&MR=1)
[Wunderground API Wrapper](https://github.com/wnadeau/wunderground)

