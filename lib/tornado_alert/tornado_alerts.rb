# Used to get tornado alerts
module DSTornadoAlert
  class TornadoAlert
    @configs = YAML.load_file('config.yml')
    @logger = Logger.new(STDOUT)
    @logger.level = @configs['log_level']

    def self.forecast
      # @logger.debug('forcast has been called')
      response = Typhoeus::Request.get("#{@configs['api_url']}/forecast/#{@configs['api_key']}/#{@configs['lat']},#{@configs['long']}"'?units=us&exclude=daily,minutely,hourly,daily,currently,flags')
      JSON.parse(response.body) if response.code == 200
    end

    def self.retrieve_alerts
      @logger.debug('retrieve_alerts has been called!')
      alert_data = forecast
      # @logger.debug(alert_data.inspect)
      alerts = alert_data['alerts']
      alert_list = {}
      alerts.each do |lert|
        alert_list[lert['title']] = convert_from_epoch(lert['expires'])
      end
      @logger.debug("Retieve alerts output: #{alert_list}")
      alert_list
    end

    def self.convert_from_epoch(epoch_time)
      Time.at(epoch_time).to_s
    end
    # TODO: Find a way to check the time of the warning
    # TODO: Find a way to only need to call the API once for all checks.
    # TODO: Find a way to create logs for this.
    # TODO: Find a way to show off a watch status as well but let warning take priority
    # TODO: Find a way to write tests for this.

    def self.tornado_check
      @logger.debug('tornado has been called')
      alerts = retrieve_alerts
      @logger.debug("Alerts in tornado check: #{alerts.inspect}")
      alerts.each do |k, v|
        if k =~ /flood/i
          puts "Tornado warning ending at: #{v}" if k =~ /warning/i
        else
          puts 'no tornado'
        end
      end
    end
  end
end
