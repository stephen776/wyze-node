'use strict';
const axios = require('axios');
const md5 = require('md5');
const moment = require('moment');
class Wyze {
  /**
   * @param {object} options
   * @constructor
   */
  constructor(options) {
    this.username = options.username;
    this.password = options.password;
    this.xApiKey =
      options.xApiKey || 'WMXHYf79Nr5gIlt3r0r7p9Tcw5bvs6BB4U8O8nGJ';
    this.userAgent = options.userAgent || 'wyze_ios_2.21.35';
    this.phoneId = options.phoneId || 'bc151f39-787b-4871-be27-5a20fd0a1937';
    this.authUrl = options.authUrl || 'https://auth-prod.api.wyze.com';
    this.baseUrl = options.baseUrl || 'https://api.wyzecam.com:8443';
    this.appVer = options.appVer || 'com.hualai.WyzeCam___2.3.69';
    this.sc = '9f275790cab94a72bd206c8876429f3c';
    this.sv = '9d74946e652647e9b6c9d59326aef104';
    this.accessToken = options.accessToken || '';
    this.refreshToken = options.refreshToken || '';
  }

  /**
   * get request data
   */
  async getRequestBodyData(data = {}) {
    return {
      access_token: this.accessToken,
      phone_id: this.phoneId,
      app_ver: this.appVer,
      sc: this.sc,
      sv: this.sv,
      ts: moment().unix(),
      ...data,
    };
  }

  /**
   * set tokens
   */
  async setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  /**
   * login to get access_token
   * @returns {data}
   */
  async login() {
    console.log('Logging In...');
    let result;
    try {
      const data = {
        user_name: this.username,
        password: md5(md5(this.password)),
      };

      const options = {
        headers: {
          'x-api-key': this.xApiKey,
          'user-agent': this.userAgent,
          'phone-id': this.phoneId,
        },
      };

      result = await axios.post(
        `${this.authUrl}/app/user/login`,
        await this.getRequestBodyData(data),
        options,
      );

      this.setTokens(
        result.data.data['access_token'],
        result.data.data['refresh_token'],
      );
    } catch (e) {
      console.log('login error...', e);
      throw e;
    }
    return result.data;
  }

  /**
   * get refresh_token
   * @returns {data}
   */
  async getRefreshToken() {
    console.log('Refreshing token...');
    let result;
    try {
      const data = {
        refresh_token: this.refreshToken,
      };
      result = await axios.post(
        `${this.baseUrl}/app/user/refresh_token`,
        await this.getRequestBodyData(data),
      );
      this.setTokens(
        result.data.data['access_token'],
        result.data.data['refresh_token'],
      );
    } catch (e) {
      console.log('refreshToken error...', e);
      throw e;
    }
    return result.data;
  }

  /**
   * get objects list
   * @returns {data}
   */
  async getObjectList() {
    let result;
    try {
      if (!this.accessToken) {
        await this.login();
      }
      result = await axios.post(
        `${this.baseUrl}/app/v2/home_page/get_object_list`,
        await this.getRequestBodyData(),
      );
      if (result.data.msg === 'AccessTokenError') {
        await this.getRefreshToken();
        return this.getObjectList();
      }
    } catch (e) {
      console.log('Error...', e);
      throw e;
    }
    return result.data;
  }

  /**
   * run action
   * @returns {data}
   */
  async runAction(instanceId, providerKey, actionKey) {
    let result;
    try {
      if (!this.accessToken) {
        await this.login();
      }

      const data = {
        provider_key: providerKey,
        instance_id: instanceId,
        action_key: actionKey,
        action_params: {},
        custom_string: '',
      };

      result = await axios.post(
        `${this.baseUrl}/app/v2/auto/run_action`,
        await this.getRequestBodyData(data),
      );

      if (result.data.msg === 'AccessTokenError') {
        await this.getRefreshToken();
        return this.runAction(instanceId, actionKey);
      }
    } catch (e) {
      console.log('Error...', e);
      throw e;
    }
    return result.data;
  }

  /**
   * get device info
   * @returns {data.data}
   */
  async getDeviceInfo(deviceMac, deviceModel) {
    let result;
    try {
      if (!this.accessToken) {
        await this.login();
      }
      const data = {
        device_mac: deviceMac,
        device_model: deviceModel,
      };
      result = await axios.post(
        `${this.baseUrl}/app/v2/device/get_device_info`,
        await this.getRequestBodyData(data),
      );
    } catch (e) {
      console.log('Error...', e);
      throw e;
    }
    return result.data.data;
  }

  /**
   * get property
   * @returns {data.property_list}
   */
  async getPropertyList(deviceMac, deviceModel) {
    let result;
    try {
      if (!this.accessToken) {
        await this.login();
      }
      const data = {
        device_mac: deviceMac,
        device_model: deviceModel,
      };
      result = await axios.post(
        `${this.baseUrl}/app/v2/device/get_property_list`,
        await this.getRequestBodyData(data),
      );
    } catch (e) {
      console.log('Error...', e);
      throw e;
    }
    return result.data.data.property_list;
  }

  /**
   * set property
   * @returns {data}
   */
  async setProperty(deviceMac, deviceModel, propertyId, propertyValue) {
    let result;
    try {
      if (!this.accessToken) {
        await this.login();
      }
      const data = {
        device_mac: deviceMac,
        device_model: deviceModel,
        pid: propertyId,
        pvalue: propertyValue,
      };
      const result = await axios.post(
        `${this.baseUrl}/app/v2/device/set_property`,
        await this.getRequestBodyData(data),
      );
    } catch (e) {
      console.log('Error...', e);
      throw e;
    }
    return result.data;
  }

  /**
   * Helper functions
   */

  /**
   * getDeviceList
   */
  async getDeviceList() {
    const result = await this.getObjectList();
    return result.data.device_list;
  }

  /**
   * getDeviceByName
   */
  async getDeviceByName(nickname) {
    const result = await this.getDeviceList();
    const device = result.find(
      (device) => device.nickname.toLowerCase() === nickname.toLowerCase(),
    );
    return device;
  }

  /**
   * getDeviceByMac
   */
  async getDeviceByMac(mac) {
    const result = await this.getDeviceList();
    const device = result.find((device) => device.mac === mac);
    return device;
  }

  /**
   * getDevicesByType
   */
  async getDevicesByType(type) {
    const result = await this.getDeviceList();
    const devices = result.filter(
      (device) => device.product_type.toLowerCase() === type.toLowerCase(),
    );
    return devices;
  }

  /**
   * getDevicesByModel
   */
  async getDevicesByModel(model) {
    const result = await this.getDeviceList();
    const devices = result.filter(
      (device) => device.product_model.toLowerCase() === model.toLowerCase(),
    );
    return devices;
  }

  /**
   * getDeviceGroupsList
   */
  async getDeviceGroupsList() {
    const result = await this.getObjectList();
    return result.data.device_group_list;
  }

  /**
   * getDeviceSortList
   */
  async getDeviceSortList() {
    const result = await this.getObjectList();
    return result.data.device_sort_list;
  }

  /**
   * turnOn
   */
  async turnOn(device) {
    return await this.runAction(device.mac, device.product_model, 'power_on');
  }

  /**
   * turnOff
   */
  async turnOff(device) {
    return await this.runAction(device.mac, device.product_model, 'power_off');
  }

  /**
   * getDeviceStatus
   */
  async getDeviceStatus(device) {
    return device.device_params;
  }

  /**
   * getDeviceState
   */
  async getDeviceState(device) {
    let state =
      device.device_params.power_switch !== undefined
        ? device.device_params.power_switch === 1
          ? 'on'
          : 'off'
        : '';
    if (!state) {
      state =
        device.device_params.open_close_state !== undefined
          ? device.device_params.open_close_state === 1
            ? 'open'
            : 'closed'
          : '';
    }
    return state;
  }
}

module.exports = Wyze;
