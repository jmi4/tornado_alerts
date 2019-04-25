# Used to get tornado alerts
module WuTornadoAlert
  class TornadoAlert
    @configs = YAML.load_file('config.yml')
    @logger = Logger.new(STDOUT)
    @logger.level = @configs['log_level']

    @ds_api = Darksky::API.new(@configs['api_key'])

    def self.getdata
      @logger.info('getdata has been called!')
      alert_data = @ds_api.forcast(@configs['zipcode'])
      alerts = JSON.parse(alert_data.to_json)
      # Used for testing alerts when alerts are not present
      # alerts['alerts'] = 'HEA HUR THU TOR'
      @logger.debug("#{alerts['alerts'].to_s}")
      if alerts['alerts'] =~ /TOR/
        # Sounds the alarm
        puts 'alerts'
      else
        # Remove this else after testing it will not be needed.
        puts 'no alerts'
      end
    end
 
  end
end
