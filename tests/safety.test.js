import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateIPv4 } from '../server/index.js';

test('blocks common private IPv4 ranges',()=>{for(const ip of ['10.0.0.1','127.0.0.1','192.168.1.1','172.16.0.1','169.254.169.254'])assert.equal(isPrivateIPv4(ip),true,ip)});
test('allows public IPv4 ranges',()=>{for(const ip of ['8.8.8.8','1.1.1.1','142.250.72.14'])assert.equal(isPrivateIPv4(ip),false,ip)});
