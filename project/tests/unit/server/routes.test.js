import { jest, expect, describe, test, beforeEach } from '@jest/globals';
import config from '../../../server/config.js';
import { Controller } from '../../../server/controller.js';
import { handler } from '../../../server/routes.js';
import TestUtil from '../_util/testUtil.js';

const { 
  pages: { homeHTML, controllerHTML }, 
  location, 
  constants: { CONTENT_TYPE } 
} = config;

describe('#Routes - test suite for api response', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('GET / - should redirect to home page', async () => {
    const params = TestUtil.defaultHandleParams();
    params.request.method = 'GET';
    params.request.url = '/';
    
    await handler(...params.values())

    expect(params.response.writeHead).toHaveBeenCalledWith(
      302, { 'Location': location.home }
    );
    expect(params.response.end).toHaveBeenCalled();
  });

  test(`GET /home - should respond with ${homeHTML} file stream`, async () => {
    const params = TestUtil.defaultHandleParams();
    params.request.method = 'GET';
    params.request.url = '/home';

    const mockFileStream = TestUtil.generateReadableStream(['data']);
    jest.spyOn(
      Controller.prototype,
      Controller.prototype.getFileStream.name,  
    ).mockResolvedValue({
      stream: mockFileStream,      
    });

    jest.spyOn(mockFileStream,"pipe").mockReturnValue();

    await handler(...params.values())

    expect(Controller.prototype.getFileStream).toBeCalledWith(homeHTML);
    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);    
  });

  test(`GET /controller - should respond with ${controllerHTML} file stream`, async () => {
    const params = TestUtil.defaultHandleParams();
    params.request.method = 'GET';
    params.request.url = '/controller';

    const mockFileStream = TestUtil.generateReadableStream(['data']);
    jest.spyOn(
      Controller.prototype,
      Controller.prototype.getFileStream.name,  
    ).mockResolvedValue({
      stream: mockFileStream,      
    });

    jest.spyOn(mockFileStream,"pipe").mockReturnValue();

    await handler(...params.values())

    expect(Controller.prototype.getFileStream).toBeCalledWith(controllerHTML);
    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);    
  });

  test(`GET /index.html - should respond with a file stream`, async () => {
    const params = TestUtil.defaultHandleParams();
    params.request.method = 'GET';
    params.request.url = '/index.html';
    
    const expectedType = '.html';
    const mockFileStream = TestUtil.generateReadableStream(['data']);
    jest.spyOn(
      Controller.prototype,
      Controller.prototype.getFileStream.name,  
    ).mockResolvedValue({
      stream: mockFileStream,
      type: expectedType,
    });

    jest.spyOn(mockFileStream,"pipe").mockReturnValue();

    await handler(...params.values())

    expect(Controller.prototype.getFileStream).toBeCalledWith('/index.html');
    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
    expect(params.response.writeHead).toHaveBeenCalledWith(
      200,
      { 'Content-Type': CONTENT_TYPE[expectedType] }
    )
  });

  test(`GET /file.ext - should respond with a file stream`, async () => {
    const params = TestUtil.defaultHandleParams();
    params.request.method = 'GET';
    params.request.url = '/file.ext';
    
    const expectedType = '.ext';
    const mockFileStream = TestUtil.generateReadableStream(['data']);
    jest.spyOn(
      Controller.prototype,
      Controller.prototype.getFileStream.name,  
    ).mockResolvedValue({
      stream: mockFileStream,
      type: expectedType,
    });

    jest.spyOn(mockFileStream,"pipe").mockReturnValue();

    await handler(...params.values())

    expect(Controller.prototype.getFileStream).toBeCalledWith('/file.ext');
    expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
    expect(params.response.writeHead).not.toHaveBeenCalled();
  });

  test(`GET /unknown - given an inexistent route it should respond with 404`, async () => {
    const params = TestUtil.defaultHandleParams();
    params.request.method = 'POST';
    params.request.url = '/unknown';

    await handler(...params.values())
  
    expect(params.response.writeHead).toHaveBeenCalledWith(404);
    expect(params.response.end).toHaveBeenCalled();
  });

  describe('execptions', () => {
    test('Given an inexistent file it should respond with 404', async () => {
      const params = TestUtil.defaultHandleParams();
      params.request.method = 'GET';
      params.request.url = '/index.png';
  
      jest.spyOn(
        Controller.prototype,
        Controller.prototype.getFileStream.name,        
      ).mockRejectedValue(
        new Error('Error: ENOENT: no such file or directory')
      );

      await handler(...params.values())
    
      expect(params.response.writeHead).toHaveBeenCalledWith(404);
      expect(params.response.end).toHaveBeenCalled();
    });
    test('Given an error it should respond with 500', async () => {
      const params = TestUtil.defaultHandleParams();
      params.request.method = 'GET';
      params.request.url = '/index.png';
  
      jest.spyOn(
        Controller.prototype,
        Controller.prototype.getFileStream.name,        
      ).mockRejectedValue(
        new Error('Error')
      );
      
      await handler(...params.values())
    
      expect(params.response.writeHead).toHaveBeenCalledWith(500);
      expect(params.response.end).toHaveBeenCalled();
    });
  })
});