export default function ether (v) {
  return web3.utils.toWei(String(v), 'ether');
}
