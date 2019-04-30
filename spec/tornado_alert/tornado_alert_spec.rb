require 'spec_helper'

describe 'DSTornadoAlert::TornadoAlert' do
  let(:lat) { '38.8846' }
  let(:long) { '-94.4971' }
  let(:api_key) { 'your-api_key' }
  let(:api_url) { 'https://api.darksky.net' }

  context '#forecast' do
    it 'should return a valid weather warning alert' do
      VCR.use_cassette('forecast', record: :once, match_requests_on: [:body]) do
        alerts = DSTornadoAlert::TornadoAlert.forecast
        expect(alerts['title']).to eq('Tornado Warning')
      end
    end
  end
end
